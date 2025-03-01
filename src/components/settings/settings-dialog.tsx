import * as React from "react";
import {
  Volume2,
  Video,
  Image,
  Bell,
  User,
  Calendar,
  Keyboard,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LuCog } from "react-icons/lu";

// Updated menu items to match the image
const data = {
  nav: [
    { name: "Audio", icon: Volume2 },
    { name: "Video", icon: Video },
    { name: "Virtual backgrounds", icon: Image },
    { name: "Notifications", icon: Bell },
    { name: "Profile", icon: User },
    { name: "Calendar", icon: Calendar },
    { name: "Shortcuts", icon: Keyboard },
    { name: "General", icon: SettingsIcon },
  ],
};

// Content components for each setting panel
const AudioSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">Audio Settings</h3>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-medium">Microphone</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>Default Microphone</option>
          <option>Headset Microphone</option>
          <option>Webcam Microphone</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="font-medium">Speaker</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>Default Speaker</option>
          <option>Headset</option>
          <option>External Speakers</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="font-medium">Volume</label>
        <input type="range" className="w-full" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="noise-suppression" />
        <label htmlFor="noise-suppression">Enable noise suppression</label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="echo-cancellation" />
        <label htmlFor="echo-cancellation">Enable echo cancellation</label>
      </div>
    </div>
  </div>
);

const VideoSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">Video Settings</h3>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-medium">Camera</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>Default Camera</option>
          <option>External Webcam</option>
          <option>Integrated Camera</option>
        </select>
      </div>
      <div className="aspect-video w-64 bg-gray-800 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Camera preview</span>
      </div>
      <div className="space-y-2">
        <label className="font-medium">Video quality</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>Low (360p)</option>
          <option>Medium (480p)</option>
          <option>High (720p)</option>
          <option>HD (1080p)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="hd-video" />
        <label htmlFor="hd-video">Enable HD video when available</label>
      </div>
    </div>
  </div>
);

const VirtualBackgroundSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">Virtual Backgrounds</h3>
    <div className="grid grid-cols-2 gap-4">
      <div className="aspect-video rounded bg-gray-800 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500">
        <span className="text-gray-400">None</span>
      </div>
      <div className="aspect-video rounded bg-gray-700 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500">
        <span className="text-gray-400">Blur</span>
      </div>
      <div className="aspect-video rounded bg-[url('/api/placeholder/180/100')] bg-cover cursor-pointer hover:ring-2 hover:ring-blue-500"></div>
      <div className="aspect-video rounded bg-[url('/api/placeholder/180/100')] bg-cover cursor-pointer hover:ring-2 hover:ring-blue-500"></div>
      <div className="aspect-video rounded bg-[url('/api/placeholder/180/100')] bg-cover cursor-pointer hover:ring-2 hover:ring-blue-500"></div>
      <button className="aspect-video rounded bg-gray-800 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500">
        <span className="text-gray-400">+ Upload</span>
      </button>
    </div>
  </div>
);

const NotificationSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">Notification Settings</h3>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label>Meeting invitations</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <label>Chat messages</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <label>People joining or leaving</label>
        <input type="checkbox" />
      </div>
      <div className="flex items-center justify-between">
        <label>Screen sharing started</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <label>Recording started</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="space-y-2">
        <label className="font-medium">Notification sound</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>Default</option>
          <option>Soft chime</option>
          <option>None</option>
        </select>
      </div>
    </div>
  </div>
);

const ProfileSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">Profile Settings</h3>
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center">
          <User size={32} />
        </div>
        <button className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700">Change photo</button>
      </div>
      <div className="space-y-2">
        <label className="font-medium">Display name</label>
        <input type="text" className="w-full rounded bg-gray-800 p-2 text-white" defaultValue="User Name" />
      </div>
      <div className="space-y-2">
        <label className="font-medium">Email</label>
        <input type="email" className="w-full rounded bg-gray-800 p-2 text-white" defaultValue="user@example.com" />
      </div>
    </div>
  </div>
);

const CalendarSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">Calendar Settings</h3>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-medium">Default calendar</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>Google Calendar</option>
          <option>Outlook Calendar</option>
          <option>Apple Calendar</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <label>Send calendar invites for scheduled meetings</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <label>Show calendar in sidebar</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="space-y-2">
        <label className="font-medium">Default meeting duration</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>15 minutes</option>
          <option>30 minutes</option>
          <option>45 minutes</option>
          <option>60 minutes</option>
        </select>
      </div>
    </div>
  </div>
);

const ShortcutsSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
    <div className="space-y-4">
      <div className="flex justify-between">
        <span>Toggle mute</span>
        <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+D</kbd>
      </div>
      <div className="flex justify-between">
        <span>Toggle video</span>
        <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+E</kbd>
      </div>
      <div className="flex justify-between">
        <span>Start/stop screen sharing</span>
        <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+Shift+S</kbd>
      </div>
      <div className="flex justify-between">
        <span>Toggle chat panel</span>
        <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+Shift+C</kbd>
      </div>
      <div className="flex justify-between">
        <span>Raise/lower hand</span>
        <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+Shift+H</kbd>
      </div>
      <div className="flex justify-between">
        <span>Leave meeting</span>
        <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+W</kbd>
      </div>
    </div>
  </div>
);

const GeneralSettings = () => (
  <div className="flex flex-col gap-4 p-4">
    <h3 className="text-lg font-medium">General Settings</h3>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-medium">Language</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>English</option>
          <option>Spanish</option>
          <option>French</option>
          <option>German</option>
          <option>Chinese</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <label>Always mute my microphone when joining</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <label>Always turn off my camera when joining</label>
        <input type="checkbox" />
      </div>
      <div className="flex items-center justify-between">
        <label>Show meeting timer</label>
        <input type="checkbox" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <label>Enable low-bandwidth mode</label>
        <input type="checkbox" />
      </div>
      <div className="space-y-2">
        <label className="font-medium">Theme</label>
        <select className="w-full rounded bg-gray-800 p-2 text-white">
          <option>Dark</option>
          <option>Light</option>
          <option>System</option>
        </select>
      </div>
    </div>
  </div>
);

export function SettingsDialog() {
  const [open, setOpen] = React.useState(false);
  const [activeSetting, setActiveSetting] = React.useState("Audio");

  // Render the content panel based on the active setting
  const renderContent = () => {
    switch (activeSetting) {
      case "Audio":
        return <AudioSettings />;
      case "Video":
        return <VideoSettings />;
      case "Virtual backgrounds":
        return <VirtualBackgroundSettings />;
      case "Notifications":
        return <NotificationSettings />;
      case "Profile":
        return <ProfileSettings />;
      case "Calendar":
        return <CalendarSettings />;
      case "Shortcuts":
        return <ShortcutsSettings />;
      case "General":
        return <GeneralSettings />;
      default:
        return <AudioSettings />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="default" className="cursor-pointer p-2">
          <LuCog className="size-7" />
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-3 md:max-h-[800px] md:max-w-[900px] bg-gray-900 text-white border-0">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
          <DialogTitle className="text-xl">Settings</DialogTitle>
          {/* <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </Button> */}
        </div>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <div className="flex h-[500px]">
          <div className="w-64 border-r border-gray-800">
            {data.nav.map((item) => (
              <button
                key={item.name}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-800 ${activeSetting === item.name ? "bg-gray-800" : ""
                  }`}
                onClick={() => setActiveSetting(item.name)}
              >
                <item.icon className="size-5" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-800">
          <Button
            variant="outline"
            className="bg-transparent border-gray-600 hover:bg-gray-800 text-white"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setOpen(false)}
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}