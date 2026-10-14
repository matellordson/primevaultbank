"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"

declare global {
  interface Window {
    smartsupp?: {
      (command: string, ...args: any[]): void
      _: any[]
    }
    _smartsupp?: Record<string, any>
  }
}

// Routes where a customer is authenticated and active
const CUSTOMER_LOGGED_IN_ROUTES = [
  "/dashboard",
  "/transfers",
  "/deposits",
  "/transactions",
  "/kyc",
]

export function SmartsuppChat() {
  const pathname = usePathname()

  // Only show the support chat when the customer is actively logged in on customer portal routes
  const isCustomerLoggedIn = Boolean(
    pathname &&
      CUSTOMER_LOGGED_IN_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      )
  )

  React.useEffect(() => {
    if (typeof window !== "undefined" && typeof window.smartsupp === "function") {
      if (isCustomerLoggedIn) {
        try {
          window.smartsupp("chat:show")
        } catch {
          // ignore
        }
      } else {
        try {
          window.smartsupp("chat:hide")
          window.smartsupp("close")
        } catch {
          // ignore
        }
      }
    }
  }, [isCustomerLoggedIn, pathname])

  // When not on an authenticated customer route (landing page, login, register, admin portal),
  // do not inject the chat script and hide any active widget instances.
  if (!isCustomerLoggedIn) {
    return (
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #chat-application,
            #smartsupp-widget,
            div[id*="smartsupp"],
            iframe[id*="smartsupp"],
            iframe[title*="Smartsupp"],
            .smartsupp-widget {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
            }
          `,
        }}
      />
    )
  }

  return (
    <>
      <Script
        id="smartsupp-chat"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var _smartsupp = _smartsupp || {};
            _smartsupp.key = 'a89f286bb2d1027f362c3f9a17c440ba9b7cdae0';
            window.smartsupp||(function(d) {
              var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
              s=d.getElementsByTagName('script')[0];c=d.createElement('script');
              c.type='text/javascript';c.charset='utf-8';c.async=true;
              c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
            })(document);
          `,
        }}
      />
      <noscript>
        Powered by{" "}
        <a href="https://www.smartsupp.com" target="_blank" rel="noreferrer">
          Smartsupp
        </a>
      </noscript>
    </>
  )
}
