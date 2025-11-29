import { Outlet } from "@remix-run/react"
import { Providers } from "./providers.js"

export default function Root() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  )
} 