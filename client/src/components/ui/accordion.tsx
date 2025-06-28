import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  collapsible?: boolean
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (v: string | string[]) => void
}

interface AccordionContextValue {
  type: "single" | "multiple"
  openValues: string[]
  toggle: (value: string) => void
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

const Accordion: React.FC<AccordionProps> = ({
  className,
  type = "single",
  collapsible = false,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}) => {
  const controlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState<string | string[] | undefined>(
    defaultValue
  )

  const currentValue = controlled ? value : internalValue

  const openValues = React.useMemo<string[]>(() => {
    if (Array.isArray(currentValue)) return currentValue
    if (typeof currentValue === "string" && currentValue !== "") return [currentValue]
    return []
  }, [currentValue])

  const updateValue = React.useCallback(
    (vals: string[]) => {
      const newVal = type === "single" ? (vals[0] ?? "") : vals
      if (!controlled) {
        setInternalValue(newVal)
      }
      onValueChange?.(newVal)
    },
    [controlled, onValueChange, type]
  )

  const toggle = React.useCallback(
    (val: string) => {
      let vals = [...openValues]
      if (type === "multiple") {
        if (vals.includes(val)) {
          vals = vals.filter((v) => v !== val)
          if (!collapsible && vals.length === 0) return
        } else {
          vals.push(val)
        }
      } else {
        if (vals[0] === val) {
          if (collapsible) {
            vals = []
          } else {
            return
          }
        } else {
          vals = [val]
        }
      }
      updateValue(vals)
    },
    [openValues, type, collapsible, updateValue]
  )

  const contextValue = React.useMemo(
    () => ({ type, openValues, toggle }),
    [type, openValues, toggle]
  )

  return (
    <AccordionContext.Provider value={contextValue}>
      <div className={cn("space-y-0", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemContext {
  open: boolean
  toggle: () => void
}

const AccordionItemContext = React.createContext<AccordionItemContext | null>(
  null
)

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext)
    if (!context) {
      return null
    }
    const { openValues, toggle } = context
    const open = openValues.includes(value)

    const handleToggle = React.useCallback(() => toggle(value), [toggle, value])

    return (
      <div ref={ref} className={cn("border-b", className)} {...props}>
        <AccordionItemContext.Provider value={{ open, toggle: handleToggle }}>
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
        "flex w-full items-center justify-between px-6 py-4 font-medium transition-all hover:no-underline",
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
