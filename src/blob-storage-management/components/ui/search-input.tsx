"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { forwardRef, useState } from "react"

export interface SearchInputProps 
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
  containerClassName?: string
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, containerClassName, ...props }, ref) => {
    const [value, setValue] = useState(props.value || "")

    const handleClear = () => {
      setValue("")
      onClear?.()
    }

    return (
      <div className={cn("relative", containerClassName)}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          className={cn("pl-9 pr-9", className)}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            props.onChange?.(e)
          }}
          {...props}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput }