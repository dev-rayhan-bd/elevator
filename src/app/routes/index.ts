import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.routes';
import { UserRoutes } from '../modules/User/user.routes';
import aboutRouter from '../modules/about/about.route';
import privacyPolicyRouter from '../modules/PrivacyPolicy/privacyPolicy.routes';
import termsRouter from '../modules/Terms/terms.route';
import { FaqRoutes } from '../modules/FAQ/faq.routes';
import { ContactRoutes } from '../modules/ContactUs/contact.route';
import { NotificationRoutes } from '../modules/Notification/notification.routes';
import { ReviewRoutes } from '../modules/Review/review.routes';
import { AdminRoutes } from '../modules/Admin/admin.routes';
import { CategoryRoutes } from '../modules/ServiceCategory/category.routes';
import { SubcategoryRoutes } from '../modules/ServiceSubcategory/subcategory.routes';
import { AmenityRoutes } from '../modules/Amenity/amenity.routes';
import { ServiceAreaRoutes } from '../modules/ServiceArea/serviceArea.routes';

import { EventTypeRoutes } from '../modules/EventType/eventType.routes';
import { VendorServiceRoutes } from '../modules/VendorService/vendorService.routes';
import { ServicePackageRoutes } from '../modules/ServicePackage/package.routes';
import { EventRequestRoutes } from '../modules/EventRequest/eventRequest.routes';
import { EventQuoteRoutes } from '../modules/EventQuote/eventQuote.routes';
import { VendorQuoteRoutes } from '../modules/VendorQuote/vendorQuote.routes';


const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route:AuthRoutes
  },
  {
    path: '/user',
    route:UserRoutes
  },
  {
    path: '/about',
    route:aboutRouter
  },
  {
    path: '/privacy',
    route:privacyPolicyRouter
  },
  {
    path: '/terms',
    route:termsRouter
  },
  {
    path: '/faq',
    route:FaqRoutes
  },
  {
    path: '/contact',
    route:ContactRoutes
  },

  { path: '/notification', route: NotificationRoutes },  
  { path: '/reviews', route: ReviewRoutes },
  { path: '/admin', route: AdminRoutes },
  { path: '/category', route: CategoryRoutes },
  { path: '/subcategory', route: SubcategoryRoutes },
  { path: '/amenity', route: AmenityRoutes },
  { path: '/service-area', route: ServiceAreaRoutes },
  { path: '/vendor-service', route: VendorServiceRoutes },
  { path: '/event-type', route: EventTypeRoutes },
  { path: '/service-package', route: ServicePackageRoutes },
  { path: '/event-request', route: EventRequestRoutes },
  { path: '/event-quote', route: EventQuoteRoutes },
  { path: '/vendor-quote', route: VendorQuoteRoutes },

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
