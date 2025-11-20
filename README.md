
```
freshflow-production
├─ admin
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ charts
│  │  │  │  ├─ BarChart.tsx
│  │  │  │  ├─ DashboardChart.tsx
│  │  │  │  ├─ LineChart.tsx
│  │  │  │  └─ PieChart.tsx
│  │  │  ├─ forms
│  │  │  │  ├─ ConfigForm.tsx
│  │  │  │  ├─ ReportForm.tsx
│  │  │  │  └─ VendorApprovalForm.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ AdminLayout.tsx
│  │  │  │  ├─ Header.tsx
│  │  │  │  └─ Sidebar.tsx
│  │  │  ├─ tables
│  │  │  │  ├─ DataTable.tsx
│  │  │  │  ├─ OrderTable.tsx
│  │  │  │  ├─ TransactionTable.tsx
│  │  │  │  └─ VendorTable.tsx
│  │  │  └─ ui
│  │  │     ├─ Badge.tsx
│  │  │     ├─ Button.tsx
│  │  │     ├─ Card.tsx
│  │  │     ├─ Dialoge.tsx
│  │  │     ├─ Input.tsx
│  │  │     └─ Table.tsx
│  │  ├─ hooks
│  │  │  ├─ useAdminAuth.ts
│  │  │  ├─ useAnalytics.ts
│  │  │  ├─ useRealTimeData.ts
│  │  │  └─ useReports.ts
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ pages
│  │  │  ├─ Analytics.tsx
│  │  │  ├─ Dashboard.tsx
│  │  │  ├─ OrderManagement.tsx
│  │  │  ├─ Reports.tsx
│  │  │  ├─ Settings.tsx
│  │  │  ├─ SystemHealth.tsx
│  │  │  └─ VendorManagement.tsx
│  │  ├─ services
│  │  │  ├─ adminApi.ts
│  │  │  ├─ analytics.ts
│  │  │  ├─ exports.ts
│  │  │  └─ reports.ts
│  │  ├─ store
│  │  │  ├─ adminStore.ts
│  │  │  ├─ analyticsStore.ts
│  │  │  ├─ orderStore.ts
│  │  │  ├─ reportStore.ts
│  │  │  └─ vendorStore.ts
│  │  ├─ styles
│  │  │  ├─ admin.css
│  │  │  └─ globals.css
│  │  ├─ types
│  │  │  ├─ admin.ts
│  │  │  ├─ analytics.ts
│  │  │  ├─ charts.ts
│  │  │  └─ reports.ts
│  │  ├─ utils
│  │  │  ├─ chartHelpers.ts
│  │  │  ├─ cn.ts
│  │  │  ├─ dataProcessing.ts
│  │  │  ├─ dateUtils.ts
│  │  │  └─ exportHelpers.ts
│  │  └─ vite-env.d.ts
│  ├─ tailwind.config.ts
│  ├─ tests
│  │  ├─ analytics.test.tsx
│  │  └─ components.test.tsx
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  └─ vite.config.ts
├─ backend
│  ├─ FreshFlow
│  │  ├─ backend
│  │  │  ├─ docs
│  │  │  │  └─ swagger.json
│  │  │  ├─ jest.config.js
│  │  │  ├─ nodemon.json
│  │  │  ├─ package-lock.json
│  │  │  ├─ package.json
│  │  │  ├─ src
│  │  │  │  ├─ app.ts
│  │  │  │  ├─ config
│  │  │  │  │  ├─ cloudinary.ts
│  │  │  │  │  ├─ database.ts
│  │  │  │  │  ├─ passport.ts
│  │  │  │  │  ├─ redis.ts
│  │  │  │  │  └─ socket.ts
│  │  │  │  ├─ controllers
│  │  │  │  │  ├─ analyticsController.ts
│  │  │  │  │  ├─ authController.ts
│  │  │  │  │  ├─ ingredientController.ts
│  │  │  │  │  ├─ orderController.ts
│  │  │  │  │  └─ userController.ts
│  │  │  │  ├─ index.css
│  │  │  │  ├─ jobs
│  │  │  │  │  ├─ dataCleanup.ts
│  │  │  │  │  ├─ expiryChecker.ts
│  │  │  │  │  └─ priceUpdater.ts
│  │  │  │  ├─ main.tsx
│  │  │  │  ├─ middleware
│  │  │  │  │  ├─ auth.ts
│  │  │  │  │  ├─ errorHandler.ts
│  │  │  │  │  ├─ rateLimit.ts
│  │  │  │  │  ├─ upload.ts
│  │  │  │  │  └─ validation.ts
│  │  │  │  ├─ models
│  │  │  │  │  ├─ Ingredient.ts
│  │  │  │  │  ├─ Notification.ts
│  │  │  │  │  ├─ Order.ts
│  │  │  │  │  ├─ Transaction.ts
│  │  │  │  │  └─ User.ts
│  │  │  │  ├─ routes
│  │  │  │  │  ├─ admin.ts
│  │  │  │  │  ├─ analytics.ts
│  │  │  │  │  ├─ auth.ts
│  │  │  │  │  ├─ ingredients.ts
│  │  │  │  │  ├─ orders.ts
│  │  │  │  │  └─ users.ts
│  │  │  │  ├─ server.ts
│  │  │  │  ├─ services
│  │  │  │  │  ├─ analyticsService.ts
│  │  │  │  │  ├─ authService.ts
│  │  │  │  │  ├─ ingredientService.ts
│  │  │  │  │  ├─ notificationService.ts
│  │  │  │  │  ├─ orderService.ts
│  │  │  │  │  └─ pricingService.ts
│  │  │  │  ├─ types
│  │  │  │  │  ├─ common.ts
│  │  │  │  │  ├─ express-validator.d.ts
│  │  │  │  │  ├─ express.d.ts
│  │  │  │  │  ├─ ingredient.ts
│  │  │  │  │  ├─ order.ts
│  │  │  │  │  └─ user.ts
│  │  │  │  ├─ utils
│  │  │  │  │  ├─ encryption.ts
│  │  │  │  │  ├─ helpers.ts
│  │  │  │  │  ├─ logger.ts
│  │  │  │  │  └─ validation.ts
│  │  │  │  └─ vite-env.d.ts
│  │  │  ├─ tests
│  │  │  │  ├─ auth.test.ts
│  │  │  │  ├─ ingredients.test.ts
│  │  │  │  └─ orders.test.ts
│  │  │  └─ tsconfig.json
│  │  ├─ eslint.config.js
│  │  ├─ index.html
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  ├─ README.md
│  │  ├─ tailwind.config.js
│  │  ├─ tsconfig.app.json
│  │  ├─ tsconfig.node.json
│  │  └─ vite.config.ts
│  └─ README.md
├─ frontend
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ public
│  │  ├─ manifest.json
│  │  └─ sw.js
│  ├─ README.md
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ features
│  │  │  │  ├─ inventory
│  │  │  │  │  ├─ AddInventoryDialog.tsx
│  │  │  │  │  ├─ AddInventroryDialog.tsx
│  │  │  │  │  ├─ InventoryList.tsx
│  │  │  │  │  ├─ InventoryManager.tsx
│  │  │  │  │  └─ InventoryStats.tsx
│  │  │  │  ├─ marketplace
│  │  │  │  │  ├─ MarketplaceGrid.tsx
│  │  │  │  │  └─ MarketplaceSearch.tsx
│  │  │  │  ├─ orders
│  │  │  │  │  ├─ OrderDetails.tsx
│  │  │  │  │  ├─ OrdersList.tsx
│  │  │  │  │  └─ OrdersManager.tsx
│  │  │  │  └─ profile
│  │  │  │     ├─ BusinessSettings.tsx
│  │  │  │     ├─ NotificationsSettings.tsx
│  │  │  │     ├─ ProfileInfo.tsx
│  │  │  │     ├─ ProfileManager.tsx
│  │  │  │     ├─ ProfileStats.tsx
│  │  │  │     └─ SecuritySettings.tsx
│  │  │  ├─ forms
│  │  │  │  ├─ ListingredientForm.tsx
│  │  │  │  ├─ LoginForm.tsx
│  │  │  │  ├─ RegisterForm.tsx
│  │  │  │  └─ SearchForm.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Footer.tsx
│  │  │  │  ├─ Header.tsx
│  │  │  │  ├─ Layout.tsx
│  │  │  │  └─ Sidebar.tsx
│  │  │  └─ ui
│  │  │     ├─ badge.tsx
│  │  │     ├─ button.tsx
│  │  │     ├─ card.tsx
│  │  │     ├─ dialog.tsx
│  │  │     ├─ input.tsx
│  │  │     └─ modal.tsx
│  │  ├─ hooks
│  │  │  ├─ useApi.ts
│  │  │  ├─ useAuth.ts
│  │  │  ├─ useLocalStorage.ts
│  │  │  └─ useSocket.ts
│  │  ├─ index.css
│  │  ├─ lib
│  │  │  └─ utils.ts
│  │  ├─ main.tsx
│  │  ├─ pages
│  │  │  ├─ auth
│  │  │  │  ├─ ForgotPassword.tsx
│  │  │  │  ├─ Login.tsx
│  │  │  │  └─ Register.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Inventory.tsx
│  │  │  │  ├─ Marketplace.tsx
│  │  │  │  ├─ Orders.tsx
│  │  │  │  └─ VendorDashboard.tsx
│  │  │  └─ Not-Found.tsx
│  │  ├─ services
│  │  │  ├─ api.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ socket.ts
│  │  │  └─ storage.ts
│  │  ├─ store
│  │  │  ├─ AppStore.ts
│  │  │  ├─ authStore.ts
│  │  │  ├─ inventoryStore.ts
│  │  │  ├─ marketplaceStore.ts
│  │  │  ├─ notificationStore.ts
│  │  │  └─ orderStore.ts
│  │  ├─ styles
│  │  │  ├─ components.css
│  │  │  └─ globals.css
│  │  ├─ types
│  │  │  ├─ api.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ common.types.ts
│  │  │  ├─ ingredient.ts
│  │  │  └─ order.ts
│  │  ├─ utils
│  │  │  ├─ constants.ts
│  │  │  ├─ formatters.ts
│  │  │  ├─ helpers.ts
│  │  │  └─ validation.ts
│  │  └─ vite-env.d.ts
│  ├─ storybook
│  │  ├─ main.ts
│  │  └─ preview.ts
│  ├─ tailwind.config.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  └─ vite.config.ts
├─ package-lock.json
└─ package.json

```