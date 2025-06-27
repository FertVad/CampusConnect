import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
}

const Accordion: React.FC<AccordionProps> = ({ className, ...props }) => (
  <div className={cn("space-y-0", className)} {...props} />
)

interface AccordionItemContext {
  open: boolean
  toggle: () => void
}

const AccordionItemContext = React.createContext<AccordionItemContext | null>(
  null
)

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, defaultOpen = false, children, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen)
    const toggle = React.useCallback(() => setOpen((o) => !o), [])

    return (
      <div ref={ref} className={cn("border-b", className)} {...props}>
        <AccordionItemContext.Provider value={{ open, toggle }}>
          {children}
        </AccordionItemContext.Provider>
      </div>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(AccordionItemContext)
  if (!context) {
    return null
  }
  const { open, toggle } = context

  return (
    <button
      ref={ref}
      onClick={toggle}
      className={cn(
        "flex w-full items-center justify-between py-4 font-medium transition-all hover:underline",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(AccordionItemContext)
  if (!context) {
    return null
  }
  const { open } = context
  const [height, setHeight] = React.useState<number>(0)
  const innerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (open) {
      const h = innerRef.current?.scrollHeight || 0
      setHeight(h)
    } else {
      setHeight(0)
    }
  }, [open, children])

  return (
    <div
      ref={ref}
      style={{ maxHeight: height }}
      className={cn(
        "overflow-hidden text-sm transition-[max-height] duration-300",
        className
      )}
      {...props}
    >
      <div ref={innerRef} className="pb-4 pt-0">
        {children}
      </div>
    </div>
  )
})

AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
