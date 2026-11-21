import { createContext, useContext, type ReactNode } from 'react'
import { en, type Messages } from './messages/en'

const MessagesContext = createContext<Messages>(en)

export function MessagesProvider({ children }: { children: ReactNode }) {
  return <MessagesContext.Provider value={en}>{children}</MessagesContext.Provider>
}

export function useMessages() {
  return useContext(MessagesContext)
}
