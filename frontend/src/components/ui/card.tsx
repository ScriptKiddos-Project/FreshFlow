import * as React from "react"
import { cn } from "../../lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Enhanced card variants for FreshFlow
const PriceCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    price: number
    originalPrice?: number
    discount?: number
    trending?: "up" | "down"
  }
>(({ className, price, originalPrice, discount, trending, children, ...props }, ref) => (
  <Card
    ref={ref}
    className={cn(
      "relative overflow-hidden transition-all hover:shadow-md",
      trending === "down" && "border-green-200 bg-green-50",
      trending === "up" && "border-red-200 bg-red-50",
      className
    )}
    {...props}
  >
    {discount && (
      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
        -{discount}%
      </div>
    )}
    {trending && (
      <div className={cn(
        "absolute top-2 left-2 p-1 rounded-full",
        trending === "down" ? "bg-green-500" : "bg-red-500"
      )}>
        {trending === "down" ? (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    )}
    {children}
  </Card>
))
PriceCard.displayName = "PriceCard"

const IngredientCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    image?: string
    title: string
    vendor: string
    expiryDate: string
    price: number
    unit: string
    stock: number
    quality: "fresh" | "good" | "expiring"
  }
>(({ className, image, title, vendor, expiryDate, price, unit, stock, quality, ...props }, ref) => {
  const qualityColors = {
    fresh: "border-green-500 bg-green-50",
    good: "border-yellow-500 bg-yellow-50", 
    expiring: "border-red-500 bg-red-50"
  }

  return (
    <Card
      ref={ref}
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg cursor-pointer",
        qualityColors[quality],
        className
      )}
      {...props}
    >
      {image && (
        <div className="h-32 bg-gray-200 overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-lg">{title}</h4>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            quality === "fresh" && "bg-green-100 text-green-800",
            quality === "good" && "bg-yellow-100 text-yellow-800",
            quality === "expiring" && "bg-red-100 text-red-800"
          )}>
            {quality}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">By {vendor}</p>
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-green-600">₹{price}/{unit}</span>
          <span className="text-sm text-gray-500">{stock} {unit} left</span>
        </div>
        <p className="text-xs text-gray-500">Expires: {expiryDate}</p>
      </CardContent>
    </Card>
  )
})
IngredientCard.displayName = "IngredientCard"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, PriceCard, IngredientCard }