import { lazy } from "react";
import { FaTachometerAlt, FaUser, FaUsers, FaUserTie, FaMoneyBillWave, FaHeadset, FaGift, FaBullhorn, FaBoxOpen, FaBell, FaCog, FaQrcode, FaFileAlt } from "react-icons/fa";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Profile = lazy(() => import("../pages/Profile"));
const Users = lazy(() => import("../pages/Users"));
const UserDetails = lazy(() => import("../pages/UserDetails"));
const SalesPersons = lazy(() => import("../pages/SalesPersons"));
const Withdrawals = lazy(() => import("../pages/Withdrawals"));
const Reports = lazy(() => import("../pages/Reports"));
const ServiceRequests = lazy(() => import("../pages/ServiceRequests"));
const Cashback = lazy(() => import("../pages/Cashback"));
const Offers = lazy(() => import("../pages/Offers"));
const Products = lazy(() => import("../pages/Products"));
const Notifications = lazy(() => import("../pages/Notifications"));
const AppSettings = lazy(() => import("../pages/AppSettings"));
const QRCodes = lazy(() => import("../pages/QRCodes"));

const routes = [
  { path: "/dashboard", component: Dashboard, name: "Dashboard", icon: FaTachometerAlt },
  { path: "/reports", component: Reports, name: "Reports & RTGS Payouts", icon: FaFileAlt },
  { path: "/users", component: Users, name: "Users", icon: FaUsers },
  { path: "/users/:id", component: UserDetails, name: "User Details", hide: true },
  { path: "/sales-persons", component: SalesPersons, name: "Sales Persons", icon: FaUserTie },
  { path: "/products", component: Products, name: "Products", icon: FaBoxOpen },
  { path: "/qrcodes", component: QRCodes, name: "QR Generator", icon: FaQrcode },
  { path: "/cashback", component: Cashback, name: "Cashback History", icon: FaGift },
  { path: "/offers", component: Offers, name: "Offers & Schemes", icon: FaBullhorn },
  { path: "/notifications", component: Notifications, name: "Push Notifications", icon: FaBell },
  { path: "/withdrawals", component: Withdrawals, name: "Payouts", icon: FaMoneyBillWave },
  { path: "/support", component: ServiceRequests, name: "Help & Support", icon: FaHeadset },
  { path: "/settings", component: AppSettings, name: "App Settings", icon: FaCog },
  { path: "/profile", component: Profile, name: "Profile", icon: FaUser },
];

export default routes;
