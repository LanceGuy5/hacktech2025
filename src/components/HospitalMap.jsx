import React from 'react'
import './HospitalMap.css'

function HospitalMap() {
  return (
    <div className='map-container'>
      <div className='map-container'>
        <h1>Hospital Map</h1>
      </div>
      <div className='map-options'>
        <div className='hospital-option'>Memorial Hospital</div>
        <div className='hospital-option'>City Medical Center</div>
        <div className='hospital-option'>Community Healthcare</div>
        
        <div className='button-container'>
          <button className='map-btn view-btn'>View</button>
          <button className='map-btn direct-btn'>Direct</button>
        </div>
      </div>
    </div>
  )
}

export default HospitalMap
