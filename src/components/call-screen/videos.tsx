import { Camera, Mic2Icon, PhoneMissed } from 'lucide-react'
import video from '../../assets/hero.mp4'
import { Button } from '../ui/button'
export default function Video({ type }: { type: 'main' | 'minor' }) {
  return type === "main" ? <div className='w-full h-4/5 rounded-2xl relative'>
    <video
      autoPlay
      muted
      loop
      playsInline
      className="w-full h-full fixed -z-10 top-0 right-0 object-cover"
    >
      <source src={video} type="video/mp4" />
      Your browser does not support the video tag
    </video>
    <span className='rounded-full w-12 h-6 backdrop-blur-2xl bg-transparent absolute top-3 left-3'>
      <span className='rounded-[50%] bg-cyan-200 w-6 h-6 p-2'>G</span> You
    </span>
    <span className='rounded-full h-fit backdrop-blur-2xl bg-transparent absolute bottom-3 left-3 right-3 w-full text-white flex items-center justify-center'>
      <Button className="h-14 w-14 grid place-content-center rounded-[50%]  backdrop-blur-2xl bg-transparent cursor-pointer"><Mic2Icon className="size-6" /></Button>
      <Button className="h-14 w-14 grid place-content-center rounded-[50%]  backdrop-blur-2xl bg-transparent cursor-pointer"><Camera className="size-6" /></Button>
      <Button className="h-14 w-20 grid place-content-center rounded-[50%] bg-red-500 cursor-pointer"><PhoneMissed className="size-6" /></Button>
    </span>
  </div> : <div className='w-1/3 h-full rounded-2xl relative'>
    <video
      autoPlay
      muted
      loop
      playsInline
      className="w-full h-full fixed -z-10 top-0 right-0 object-cover"
    >
      <source src={video} type="video/mp4" />
      Your browser does not support the video tag
    </video>
    <Button className="h-10 w-10 grid place-content-center rounded-[50%]  backdrop-blur-2xl bg-transparent cursor-pointer absolute top-3 right-3 "><Mic2Icon className="size-6" /></Button>
    <span className='rounded-full w-20 h-6 backdrop-blur-2xl bg-transparent absolute bottom-3 right-[50%] left-[50%]'>
      Miss Victoria
    </span>
  </div>
}