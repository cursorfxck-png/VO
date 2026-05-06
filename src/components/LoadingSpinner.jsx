import React from 'react';

const LoadingSpinner = () => {
    return (
        <div className="ios-spinner-container">
            <div className="ios-spinner">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="ios-spinner-blade"></div>
                ))}
            </div>
            <style>{`
        .ios-spinner-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .ios-spinner {
          position: relative;
          width: 30px;
          height: 30px;
        }
        .ios-spinner-blade {
          position: absolute;
          left: 44.5%;
          top: 0;
          width: 11%;
          height: 27%;
          border-radius: 50px;
          background-color: #8e8e93;
          animation: ios-spinner-fade 1s linear infinite;
          transform-origin: center 185%;
        }
        @keyframes ios-spinner-fade {
          0% { opacity: 1; }
          100% { opacity: 0.25; }
        }
        .ios-spinner-blade:nth-child(1) { transform: rotate(0deg) translate(0, -142%); animation-delay: -1s; }
        .ios-spinner-blade:nth-child(2) { transform: rotate(30deg) translate(0, -142%); animation-delay: -0.9167s; }
        .ios-spinner-blade:nth-child(3) { transform: rotate(60deg) translate(0, -142%); animation-delay: -0.8333s; }
        .ios-spinner-blade:nth-child(4) { transform: rotate(90deg) translate(0, -142%); animation-delay: -0.75s; }
        .ios-spinner-blade:nth-child(5) { transform: rotate(120deg) translate(0, -142%); animation-delay: -0.6667s; }
        .ios-spinner-blade:nth-child(6) { transform: rotate(150deg) translate(0, -142%); animation-delay: -0.5833s; }
        .ios-spinner-blade:nth-child(7) { transform: rotate(180deg) translate(0, -142%); animation-delay: -0.5s; }
        .ios-spinner-blade:nth-child(8) { transform: rotate(210deg) translate(0, -142%); animation-delay: -0.4167s; }
        .ios-spinner-blade:nth-child(9) { transform: rotate(240deg) translate(0, -142%); animation-delay: -0.3333s; }
        .ios-spinner-blade:nth-child(10) { transform: rotate(270deg) translate(0, -142%); animation-delay: -0.25s; }
        .ios-spinner-blade:nth-child(11) { transform: rotate(300deg) translate(0, -142%); animation-delay: -0.1667s; }
        .ios-spinner-blade:nth-child(12) { transform: rotate(330deg) translate(0, -142%); animation-delay: -0.0833s; }
      `}</style>
        </div>
    );
};

export default LoadingSpinner;
