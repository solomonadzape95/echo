import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SettingsDialog } from "./settings/settings-dialog";

export default function LandingPage() {
  return <div style={{ backgroundImage: `url('../src/assets/hero.jpg')` }} className="w-screen h-screen bg-cover relative flex justify-center items-center">
    <div className="absolute top-0 right-0 bg-[#000000]/20 w-full h-full"></div>
    <span className="flex items-center justify-between max-w-7xl mx-auto fixed top-10 right-20 left-20">
      <img src="../src/assets/logo.png" width={100} />
      <SettingsDialog />
    </span>
    <div className="p-5 relative z-10 text-white font text-center w-6xl min-h-[30vh] flex flex-col justify-evenly gap-16">
      <span ><h1 className="text-8xl">Echo</h1>
        <p className="text-3xl mx-auto">Connect, Communicate,  Collaborate — Seamlessly.</p></span>
      <div className="grid grid-cols-2 items-center justify-evenly mx-auto gap-4">
        <Button className="p-8 bg-gray-900 hover:bg-gray-800 transition-all cursor-pointer rounded-xl text-xl">Create a Meeting</Button>
        <span className="relative">
          <Input type="text" className="py-8 placeholder:text-white pl-4 pr-24 w-full placeholder:text-md text-md" placeholder="Enter meeting code" />
          <Button className="absolute right-2 top-2 p-6 bg-gray-900 hover:bg-gray-800 transition-all cursor-pointer rounded-xl">Join</Button></span></div>
    </div>
  </div>
}