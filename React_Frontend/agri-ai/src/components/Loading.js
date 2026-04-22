import React from 'react'
import "../styles/Loading.css"

function Loading() {
  return (
    <div className="ld-root">
      <div className="ld-orb ld-orb--1" />
      <div className="ld-orb ld-orb--2" />

      <div className="ld-core">
        {/* Spinning rings */}
        <div className="ld-rings">
          <div className="ld-ring ld-ring--outer" />
          <div className="ld-ring ld-ring--mid" />
          <div className="ld-ring ld-ring--inner" />
          <div className="ld-dot" />
        </div>

        <p className="ld-label">Analysing</p>
        <div className="ld-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}

export default Loading