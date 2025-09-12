import React from 'react'

function Footer() {
  return (
    
    <footer className='w-screen h-[800px] overflow-hidden relative flex items-center justify-center'>

      <div className='absolute bottom-0 z-[-1] w-full'>
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="110%" viewBox="0 0 1917 780" fill="none">
          <path d="M96.5 0L0 352.5V780H1917V318.5L96.5 0Z" fill="#1d1d1d" />
          <path d="M96.5 0L0 352.5V780H1917V318.5L96.5 0Z" fill="black" fill-opacity="0.2" />
        </svg>
      </div>
      <div className=' absolute bottom-[5vh] rounded-2xl bg-white w-[90vw] h-[320px] p-[2em]'>
      </div>


    </footer>
  )
}

export default Footer
