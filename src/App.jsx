import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AudioWaterShader from './Components/AudioWaveshader'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={ <AudioWaterShader /> } />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
