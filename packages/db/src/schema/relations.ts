import { relations } from 'drizzle-orm'
import { users } from './users.js'
import { serviceCategories, cities, districts } from './categories.js'
import { providerProfiles, providerServices, serviceAreas } from './providers.js'
import { workingHours, availabilityExceptions } from './calendar.js'
import { clientContacts, bookingRequests, bookingStatusHistory } from './bookings.js'
import { reviews } from './reviews.js'
import { mediaAssets } from './media.js'
import { notifications } from './notifications.js'

// === Users ===

export const usersRelations = relations(users, ({ one }) => ({
  providerProfile: one(providerProfiles, {
    fields: [users.id],
    references: [providerProfiles.userId],
  }),
}))

// === Categories ===

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  providers: many(providerProfiles),
}))

export const citiesRelations = relations(cities, ({ many }) => ({
  districts: many(districts),
  providers: many(providerProfiles),
}))

export const districtsRelations = relations(districts, ({ one, many }) => ({
  city: one(cities, {
    fields: [districts.cityId],
    references: [cities.id],
  }),
  serviceAreas: many(serviceAreas),
}))

// === Provider ===

export const providerProfilesRelations = relations(providerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [providerProfiles.userId],
    references: [users.id],
  }),
  category: one(serviceCategories, {
    fields: [providerProfiles.categoryId],
    references: [serviceCategories.id],
  }),
  city: one(cities, {
    fields: [providerProfiles.cityId],
    references: [cities.id],
  }),
  services: many(providerServices),
  serviceAreas: many(serviceAreas),
  workingHours: many(workingHours),
  availabilityExceptions: many(availabilityExceptions),
  bookings: many(bookingRequests),
  reviews: many(reviews),
  mediaAssets: many(mediaAssets),
}))

export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [providerServices.providerId],
    references: [providerProfiles.id],
  }),
}))

export const serviceAreasRelations = relations(serviceAreas, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [serviceAreas.providerId],
    references: [providerProfiles.id],
  }),
  district: one(districts, {
    fields: [serviceAreas.districtId],
    references: [districts.id],
  }),
}))

// === Calendar ===

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [workingHours.providerId],
    references: [providerProfiles.id],
  }),
}))

export const availabilityExceptionsRelations = relations(availabilityExceptions, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [availabilityExceptions.providerId],
    references: [providerProfiles.id],
  }),
}))

// === Bookings ===

export const clientContactsRelations = relations(clientContacts, ({ many }) => ({
  bookings: many(bookingRequests),
  reviews: many(reviews),
}))

export const bookingRequestsRelations = relations(bookingRequests, ({ one, many }) => ({
  provider: one(providerProfiles, {
    fields: [bookingRequests.providerId],
    references: [providerProfiles.id],
  }),
  service: one(providerServices, {
    fields: [bookingRequests.serviceId],
    references: [providerServices.id],
  }),
  clientContact: one(clientContacts, {
    fields: [bookingRequests.clientContactId],
    references: [clientContacts.id],
  }),
  statusHistory: many(bookingStatusHistory),
  review: one(reviews),
  notifications: many(notifications),
}))

export const bookingStatusHistoryRelations = relations(bookingStatusHistory, ({ one }) => ({
  booking: one(bookingRequests, {
    fields: [bookingStatusHistory.bookingId],
    references: [bookingRequests.id],
  }),
}))

// === Reviews ===

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookingRequests, {
    fields: [reviews.bookingId],
    references: [bookingRequests.id],
  }),
  provider: one(providerProfiles, {
    fields: [reviews.providerId],
    references: [providerProfiles.id],
  }),
  clientContact: one(clientContacts, {
    fields: [reviews.clientContactId],
    references: [clientContacts.id],
  }),
}))

// === Media ===

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [mediaAssets.providerId],
    references: [providerProfiles.id],
  }),
}))

// === Notifications ===

export const notificationsRelations = relations(notifications, ({ one }) => ({
  booking: one(bookingRequests, {
    fields: [notifications.bookingId],
    references: [bookingRequests.id],
  }),
}))
