import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
 LayoutDashboard, 
 Store, 
 Package, 
 ShoppingCart, 
 TrendingUp, 
 Settings, 
 User, 
 Bell,
 HelpCircle,
 BarChart3,
 Clock,
 X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface SidebarProps {
 isOpen?: boolean
 onClose?: () => void
 className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose, className }) => {
 const location = useLocation()
 const { user } = useAuthStore()

 const navigation = [
   {
     name: 'Dashboard',
     href: '/dashboard',
     icon: LayoutDashboard,
     description: 'Overview and quick stats'
   },
   {
     name: 'Marketplace',
     href: '/marketplace',
     icon: Store,
     description: 'Browse and buy ingredients'
   },
   {
     name: 'My Inventory',
     href: '/inventory',
     icon: Package,
     description: 'Manage your stock'
   },
   {
     name: 'Orders',
     href: '/orders',
     icon: ShoppingCart,
     description: 'Track your transactions'
   },
   {
     name: 'Analytics',
     href: '/analytics',
     icon: BarChart3,
     description: 'Business insights'
   },
   {
     name: 'Price Trends',
     href: '/trends',
     icon: TrendingUp,
     description: 'Market price analysis'
   }
 ]

 const secondaryNavigation = [
   {
     name: 'Notifications',
     href: '/notifications',
     icon: Bell,
     description: 'Alerts and updates'
   },
   {
     name: 'Profile',
     href: '/profile',
     icon: User,
     description: 'Account settings'
   },
   {
     name: 'Settings',
     href: '/settings',
     icon: Settings,
     description: 'App preferences'
   },
   {
     name: 'Help & Support',
     href: '/help',
     icon: HelpCircle,
     description: 'Get assistance'
   }
 ]

 const quickStats = [
   {
     name: 'Active Listings',
     value: '12',
     icon: Package,
     color: 'text-blue-600'
   },
   {
     name: 'Pending Orders',
     value: '3',
     icon: Clock,
     color: 'text-yellow-600'
   },
   {
     name: 'This Week Sales',
     value: '₹2,450',
     icon: TrendingUp,
     color: 'text-green-600'
   }
 ]

 const isActiveLink = (href: string) => {
   return location.pathname === href || location.pathname.startsWith(href + '/')
 }

 return (
   <>
     {/* Mobile overlay */}
     {isOpen && (
       <div 
         className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
         onClick={onClose}
       />
     )}

     {/* Sidebar */}
     <div
       className={cn(
         "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:shadow-none lg:border-r border-gray-200",
         isOpen ? "translate-x-0" : "-translate-x-full",
         className
       )}
     >
       {/* Header */}
       <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 lg:border-b-0">
         <Link to="/dashboard" className="flex items-center space-x-2">
           <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
             <span className="text-white font-bold text-sm">FF</span>
           </div>
           <span className="font-bold text-green-600">FreshFlow</span>
         </Link>
         
         <button
           onClick={onClose}
           className="lg:hidden p-1 rounded-md hover:bg-gray-100"
         >
           <X className="h-5 w-5" />
         </button>
       </div>

       {/* User Info */}
       <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
         <div className="flex items-center space-x-3">
           <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
             {user?.avatar ? (
               <img
                 src={user.avatar}
                 alt={user.name}
                 className="h-10 w-10 rounded-full object-cover"
               />
             ) : (
               <User className="h-5 w-5 text-gray-600" />
             )}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-gray-900 truncate">
               {user?.name || 'User'}
             </p>
             <p className="text-xs text-gray-500 truncate">
               {user?.businessName || user?.email}
             </p>
             <p className="text-xs text-blue-600 capitalize">
               {(user as any)?.role || 'vendor'}
             </p>
           </div>
         </div>
       </div>

       {/* Quick Stats */}
       <div className="px-6 py-4 border-b border-gray-200">
         <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
           Quick Stats
         </h3>
         <div className="space-y-2">
           {quickStats.map((stat) => (
             <div key={stat.name} className="flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <stat.icon className={cn("h-4 w-4", stat.color)} />
                 <span className="text-sm text-gray-600">{stat.name}</span>
               </div>
               <span className="text-sm font-semibold text-gray-900">
                 {stat.value}
               </span>
             </div>
           ))}
         </div>
       </div>

       {/* Navigation */}
       <div className="flex-1 px-6 py-4 overflow-y-auto">
         <nav className="space-y-1">
           {/* Primary Navigation */}
           <div>
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
               Main Menu
             </h3>
             {navigation.map((item) => {
               const isActive = isActiveLink(item.href)
               return (
                 <Link
                   key={item.name}
                   to={item.href}
                   onClick={onClose}
                   className={cn(
                     "group flex flex-col p-3 rounded-lg text-sm font-medium transition-colors duration-150",
                     isActive
                       ? "bg-green-100 text-green-700 border-l-4 border-green-600"
                       : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                   )}
                 >
                   <div className="flex items-center">
                     <item.icon
                       className={cn(
                         "mr-3 h-5 w-5 flex-shrink-0",
                         isActive ? "text-green-600" : "text-gray-400 group-hover:text-gray-500"
                       )}
                     />
                     {item.name}
                   </div>
                   <span className="ml-8 text-xs text-gray-500 mt-1">
                     {item.description}
                   </span>
                 </Link>
               )
             })}
           </div>

           {/* Secondary Navigation */}
           <div className="mt-8">
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
               Account
             </h3>
             {secondaryNavigation.map((item) => {
               const isActive = isActiveLink(item.href)
               return (
                 <Link
                   key={item.name}
                   to={item.href}
                   onClick={onClose}
                   className={cn(
                     "group flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                     isActive
                       ? "bg-gray-100 text-gray-900"
                       : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                   )}
                 >
                   <item.icon
                     className={cn(
                       "mr-3 h-4 w-4 flex-shrink-0",
                       isActive ? "text-gray-700" : "text-gray-400 group-hover:text-gray-500"
                     )}
                   />
                   {item.name}
                 </Link>
               )
             })}
           </div>
         </nav>
       </div>

       {/* Bottom Section */}
       <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
         <div className="bg-blue-50 rounded-lg p-3">
           <div className="flex items-center">
             <div className="flex-shrink-0">
               <TrendingUp className="h-5 w-5 text-blue-600" />
             </div>
             <div className="ml-3">
               <p className="text-sm font-medium text-blue-800">
                 Boost Your Sales
               </p>
               <p className="text-xs text-blue-600">
                 List more fresh ingredients
               </p>
             </div>
           </div>
           <button className="mt-3 w-full bg-blue-600 text-white text-xs py-2 px-3 rounded-md hover:bg-blue-700 transition-colors">
             Add Ingredient
           </button>
         </div>
       </div>
     </div>
   </>
 )
}

export default Sidebar