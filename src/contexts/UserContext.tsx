import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid'
interface UserContextType {
  userId: string | null;
}

// turns out useContext requires a default value 
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<null | string>(null);
  useEffect(() => {
    let storedUserId = localStorage.getItem("echo_user_id");

    if (!storedUserId) {
      storedUserId = uuidv4();
      // console.log(storedUserId)
      localStorage.setItem("echo_user_id", storedUserId);
    }

    setUserId(storedUserId);
  }, [])
  return <UserContext.Provider value={{ userId }}>
    {children}
  </UserContext.Provider>
}
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}