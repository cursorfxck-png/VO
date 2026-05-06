from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
import os
import httpx
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = FastAPI(
    title="VogueX API",
    description="Python backend for VogueX social platform",
    version="1.0.0"
)

# CORS - allow the frontend to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("⚠️  WARNING: Supabase credentials not found in environment variables.")
    print("   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or Replit Secrets")

def get_supabase_headers(jwt_token: Optional[str] = None) -> dict:
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if jwt_token:
        headers["Authorization"] = f"Bearer {jwt_token}"
    else:
        headers["Authorization"] = f"Bearer {SUPABASE_ANON_KEY}"
    return headers

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract and validate the JWT token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    return token

async def supabase_request(method: str, path: str, jwt_token: Optional[str] = None, **kwargs):
    """Make an authenticated request to Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = get_supabase_headers(jwt_token)
    
    async with httpx.AsyncClient() as client:
        response = await client.request(method, url, headers=headers, **kwargs)
        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json() if response.content else "Supabase error"
            )
        return response.json()

# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "VogueX API",
        "timestamp": datetime.utcnow().isoformat(),
        "supabase_connected": bool(SUPABASE_URL)
    }

@app.get("/")
async def root():
    return {
        "message": "VogueX Python API",
        "docs": "/docs",
        "health": "/health"
    }

# ============================================================
# POSTS ENDPOINTS
# ============================================================

@app.get("/api/posts")
async def get_posts(
    limit: int = 50,
    offset: int = 0,
    feed_type: str = "forYou",
    token: Optional[str] = Depends(get_current_user)
):
    """Get posts for the feed with pagination."""
    try:
        params = {
            "select": "*",
            "order": "created_at.desc",
            "limit": str(limit),
            "offset": str(offset)
        }
        posts = await supabase_request("GET", "posts", jwt_token=token, params=params)
        return {"posts": posts, "count": len(posts)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/posts/{post_id}")
async def get_post(post_id: int, token: Optional[str] = Depends(get_current_user)):
    """Get a single post by ID."""
    try:
        params = {"select": "*", "id": f"eq.{post_id}"}
        posts = await supabase_request("GET", "posts", jwt_token=token, params=params)
        if not posts:
            raise HTTPException(status_code=404, detail="Post not found")
        
        post = posts[0]
        
        # Fetch profile for the post author
        profile_params = {
            "select": "id,username,full_name,avatar_url",
            "id": f"eq.{post['user_id']}"
        }
        profiles = await supabase_request("GET", "profiles", jwt_token=token, params=profile_params)
        post["profiles"] = profiles[0] if profiles else None
        
        return post
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/posts/{post_id}/url")
async def get_post_url(post_id: int, request: Request):
    """Get the shareable URL for a post."""
    base_url = str(request.base_url).rstrip("/")
    # The frontend URL will be different from the API URL
    return {
        "post_id": post_id,
        "url": f"/post/{post_id}",
        "api_url": f"{base_url}/api/posts/{post_id}"
    }

# ============================================================
# PROFILES ENDPOINTS
# ============================================================

@app.get("/api/profiles/{username}")
async def get_profile_by_username(username: str, token: Optional[str] = Depends(get_current_user)):
    """Get a user profile by username."""
    try:
        params = {
            "select": "id,username,full_name,avatar_url,website,email",
            "username": f"eq.{username}"
        }
        profiles = await supabase_request("GET", "profiles", jwt_token=token, params=params)
        if not profiles:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile = profiles[0]
        
        # Check if verified
        verified_params = {"select": "username", "username": f"eq.{username}"}
        try:
            verified = await supabase_request("GET", "verified_users", jwt_token=token, params=verified_params)
            profile["is_verified"] = len(verified) > 0
        except:
            profile["is_verified"] = False
        
        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profiles/{username}/url")
async def get_profile_url(username: str):
    """Get the shareable URL for a user profile."""
    return {
        "username": username,
        "url": f"/u/{username}"
    }

@app.get("/api/profiles/{username}/posts")
async def get_user_posts(username: str, limit: int = 50, token: Optional[str] = Depends(get_current_user)):
    """Get all posts by a user."""
    try:
        # First get the user's ID
        profile_params = {"select": "id", "username": f"eq.{username}"}
        profiles = await supabase_request("GET", "profiles", jwt_token=token, params=profile_params)
        if not profiles:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = profiles[0]["id"]
        
        # Get posts
        posts_params = {
            "select": "*",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": str(limit)
        }
        posts = await supabase_request("GET", "posts", jwt_token=token, params=posts_params)
        return {"posts": posts, "user_id": user_id, "count": len(posts)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# FEED ENDPOINTS
# ============================================================

@app.get("/api/feed")
async def get_feed(
    limit: int = 50,
    offset: int = 0,
    feed_type: str = "forYou",
    user_id: Optional[str] = None,
    token: Optional[str] = Depends(get_current_user)
):
    """Get the feed for a user with caching headers."""
    try:
        posts_params = {
            "select": "*",
            "order": "created_at.desc",
            "limit": str(limit),
            "offset": str(offset)
        }
        
        if feed_type == "following" and user_id:
            # Get following list
            following_params = {"select": "following_id", "follower_id": f"eq.{user_id}"}
            following = await supabase_request("GET", "followers", jwt_token=token, params=following_params)
            following_ids = [f["following_id"] for f in following]
            
            if not following_ids:
                return {"posts": [], "count": 0, "feed_type": feed_type}
            
            # Supabase filter for multiple IDs
            posts_params["user_id"] = f"in.({','.join(following_ids)})"
        
        posts = await supabase_request("GET", "posts", jwt_token=token, params=posts_params)
        
        # Enrich posts with profiles
        if posts:
            user_ids = list(set(p["user_id"] for p in posts))
            profiles_params = {
                "select": "id,username,full_name,avatar_url",
                "id": f"in.({','.join(user_ids)})"
            }
            profiles = await supabase_request("GET", "profiles", jwt_token=token, params=profiles_params)
            profiles_map = {p["id"]: p for p in profiles}
            
            for post in posts:
                post["profiles"] = profiles_map.get(post["user_id"])
                post["url"] = f"/post/{post['id']}"
        
        return {"posts": posts, "count": len(posts), "feed_type": feed_type}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# MESSAGES ENDPOINTS
# ============================================================

@app.get("/api/messages/{other_user_id}")
async def get_messages(
    other_user_id: str,
    user_id: str,
    limit: int = 100,
    token: Optional[str] = Depends(get_current_user)
):
    """Get messages between two users."""
    try:
        params = {
            "select": "*",
            "or": f"and(sender_id.eq.{user_id},receiver_id.eq.{other_user_id}),and(sender_id.eq.{other_user_id},receiver_id.eq.{user_id})",
            "order": "created_at.asc",
            "limit": str(limit)
        }
        messages = await supabase_request("GET", "messages", jwt_token=token, params=params)
        return {"messages": messages, "count": len(messages)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# SEARCH ENDPOINTS
# ============================================================

@app.get("/api/search")
async def search(
    q: str,
    search_type: str = "all",
    token: Optional[str] = Depends(get_current_user)
):
    """Search for posts and users."""
    try:
        results = {}
        
        if search_type in ("all", "posts"):
            posts_params = {
                "select": "*",
                "content": f"ilike.*{q}*",
                "order": "created_at.desc",
                "limit": "20"
            }
            results["posts"] = await supabase_request("GET", "posts", jwt_token=token, params=posts_params)
        
        if search_type in ("all", "users"):
            users_params = {
                "select": "id,username,full_name,avatar_url",
                "or": f"username.ilike.*{q}*,full_name.ilike.*{q}*",
                "limit": "20"
            }
            results["users"] = await supabase_request("GET", "profiles", jwt_token=token, params=users_params)
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# STATS ENDPOINTS
# ============================================================

@app.get("/api/posts/{post_id}/stats")
async def get_post_stats(post_id: int, token: Optional[str] = Depends(get_current_user)):
    """Get likes and comments count for a post."""
    try:
        # Get likes count
        likes_params = {"select": "id", "post_id": f"eq.{post_id}"}
        likes = await supabase_request("GET", "likes", jwt_token=token, params=likes_params)
        
        # Get comments count
        comments_params = {"select": "id", "post_id": f"eq.{post_id}"}
        comments = await supabase_request("GET", "comments", jwt_token=token, params=comments_params)
        
        return {
            "post_id": post_id,
            "likes_count": len(likes),
            "comments_count": len(comments)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
