# Timezone Support in API Requests

## Description

Add comprehensive timezone support to API requests by allowing clients to send timezone information in request headers, and enabling the server to process and utilize this timezone data for date/time operations, logging, and response formatting. This implementation follows best practices from mature applications , ensuring automatic timezone detection, proper validation, and consistent date handling across the application.

## Technical Requirements

### Core Functionality

- **Automatic Detection**: Detect user's browser timezone on login and store in user profile
- **Database Storage**: Store user timezone preference in database for persistence
- **Request Headers**: Include timezone in API requests for server-side processing
- **Server-Side Processing**: Extract and validate timezone from request headers
- **Context Management**: Store timezone in request context for use throughout the request lifecycle
- **Date Processing**: Use timezone information for server-side date/time operations
- **Logging Enhancement**: Include timezone in request logs for better debugging
- **Response Formatting**: Format response dates in user's timezone when appropriate
- **Validation**: Strict IANA timezone validation using browser APIs

### Files to Create/Modify

#### Client-Side Changes

- `apps/client/src/lib/request.ts` - Add timezone header to axios instance
- `apps/client/src/lib/time-format.ts` - Add timezone detection utilities
- `apps/client/src/lib/websocket.ts` - Add timezone to WebSocket connections
- `apps/client/src/lib/event-source.ts` - Add timezone to EventSource requests
- `apps/client/src/stores/user.ts` - Add timezone field to user store
- `apps/client/src/hooks/use-timezone.ts` - Create timezone detection and management hook

#### Server-Side Changes

- `apps/api/src/_shared/interceptors/timezone.interceptor.ts` - New interceptor to extract timezone
- `apps/api/src/_shared/middlewares/timezone.middleware.ts` - New middleware for timezone processing
- `apps/api/src/_shared/utils/timezone.context.ts` - Timezone context management
- `apps/api/src/_shared/utils/timezone.validation.ts` - IANA timezone validation utilities
- `apps/api/src/main.ts` - Update CORS headers to allow timezone header
- `apps/api/src/_shared/middlewares/request-logger.middleware.ts` - Include timezone in logs
- `apps/api/src/_shared/socket/shared/auth.gateway.ts` - Add timezone to WebSocket auth
- `apps/api/prisma/migrations/` - Add timezone field to User model
- `packages/contracts/src/user.ts` - Add timezone to user contracts
- `apps/api/src/user/user.service.ts` - Add timezone update functionality

### Algorithm Design

#### 1. Client-Side Timezone Detection

```typescript
// Automatic timezone detection on login ()
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Store in user profile if different from current
if (user.timezone !== userTimezone) {
  await userService.updateUser({ timezone: userTimezone });
}

// Use for requests with fallback priority:
// 1. User's stored timezone preference
// 2. Workspace timezone setting
// 3. Browser detected timezone
// 4. UTC fallback
const timezone =
  user.timezone || workspaceSettings?.timezone || userTimezone || "UTC";
```

#### 2. Request Header Strategy

- **Header Name**: `X-User-Timezone` (standard convention)
- **Format**: IANA timezone string (e.g., "America/New_York", "Europe/London")
- **Validation**: Use browser's `Intl.DateTimeFormat` API for validation ()
- **Fallback**: Default to "UTC" if invalid or missing
- **Persistence**: Store timezone in user profile for future requests

#### 3. Server-Side Processing Flow

```typescript
// 1. Extract timezone from headers
const timezone = req.headers["x-user-timezone"];

// 2. Validate using browser-compatible method ()
const isValidTimezone = (tz: string) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// 3. Store in request context (CLS) for use throughout request
this.cls.set("userTimezone", timezone || "UTC");

// 4. Use throughout request lifecycle
// 5. Include in logging and responses
// 6. Update user profile if timezone changed
```

#### 4. Context Management

- Use NestJS CLS (Continuation Local Storage) to store timezone per request
- Provide utility functions to access timezone in services/controllers
- Ensure timezone persists across async operations

### API Interface Design

#### Client-Side Functions

- `getUserTimezone()` - Get current user's timezone with fallback chain
- `detectBrowserTimezone()` - Detect browser timezone using Intl API
- `setTimezoneHeader(config)` - Add timezone to request config
- `createTimezoneAwareRequest()` - Create request with timezone support
- `updateUserTimezone(timezone)` - Update user's timezone preference
- `useTimezone()` - React hook for timezone management

#### Server-Side Functions

- `getRequestTimezone()` - Get timezone from current request context
- `formatDateInTimezone(date, timezone)` - Format dates in user's timezone
- `validateTimezone(timezone)` - Validate IANA timezone using Intl API ()
- `updateUserTimezone(userId, timezone)` - Update user's timezone in database
- `getTimezoneFromHeaders(req)` - Extract and validate timezone from request headers

#### Middleware/Interceptor Integration

- **TimezoneInterceptor**: Extract and validate timezone from headers
- **TimezoneMiddleware**: Process timezone and store in context
- **RequestLoggerMiddleware**: Include timezone in request logs

### Integration Strategy

#### Phase 1: Database and User Model Updates

1. **Database Migration**: Add timezone field to User model
2. **User Contracts**: Update user contracts to include timezone field
3. **User Service**: Add timezone update functionality to user service
4. **API Validation**: Add timezone validation to user update endpoints

#### Phase 2: Client-Side Implementation

1. **Timezone Detection**: Add automatic timezone detection utilities ()
2. **User Store**: Add timezone field to user store
3. **Header Injection**: Modify axios instance to include timezone header
4. **WebSocket Support**: Add timezone to WebSocket connection headers
5. **EventSource Support**: Include timezone in EventSource requests
6. **Login Integration**: Auto-detect and store timezone on user login

#### Phase 3: Server-Side Infrastructure

1. **CORS Configuration**: Update CORS to allow timezone header
2. **Timezone Interceptor**: Create interceptor to extract timezone
3. **Context Management**: Set up timezone context storage using CLS
4. **Validation Logic**: Add timezone validation utilities using Intl API
5. **Request Logging**: Include timezone in request logs

#### Phase 4: Integration and Enhancement

1. **WebSocket Integration**: Add timezone to WebSocket auth
2. **Response Formatting**: Optional timezone-aware response formatting
3. **Error Handling**: Graceful fallback for invalid timezones
4. **Testing**: Comprehensive testing with different timezones
5. **Documentation**: Update API documentation with timezone support

### Error Handling

- **Invalid Timezone**: Fallback to UTC with warning log, don't update user profile
- **Missing Timezone**: Use UTC as default, attempt auto-detection on next request
- **Client Detection Failure**: Fallback to workspace settings or UTC
- **Server Processing Error**: Continue with UTC, log error, don't break request
- **Database Update Failure**: Log error but continue with current timezone
- **Validation Failure**: Use UTC fallback, log validation error for debugging

### Security Considerations

- **Header Validation**: Strict validation of timezone strings
- **Size Limits**: Prevent oversized timezone headers
- **Injection Prevention**: Sanitize timezone input
- **Rate Limiting**: Consider timezone header in rate limiting

### Performance Considerations

- **Header Size**: Minimal impact on request size
- **Validation Caching**: Cache timezone validation results
- **Context Storage**: Efficient CLS storage for timezone
- **Logging Overhead**: Minimal impact on request logging

### Testing Strategy

- **Unit Tests**: Test timezone detection, validation, and formatting
- **Integration Tests**: Test header injection, extraction, and database updates
- **E2E Tests**: Test full request/response cycle with different timezones
- **Edge Cases**: Test invalid timezones, missing headers, browser compatibility
- **Timezone Tests**: Test with various IANA timezones (UTC, EST, PST, etc.)
- **Migration Tests**: Test timezone field addition to existing users
- **Performance Tests**: Ensure timezone handling doesn't impact request performance

### Dependencies

- **Client**: No additional dependencies (uses native Intl API)
- **Server**: `date-fns-tz` (already installed), `nestjs-cls` (already available)
- **Validation**: IANA timezone database validation

### Migration Strategy

- **Database Migration**: Add timezone field as nullable to existing users
- **Backward Compatibility**: Server handles requests without timezone header gracefully
- **Gradual Rollout**: Deploy server changes first, then client updates
- **Auto-Detection**: Automatically detect and store timezone for existing users on login
- **Feature Flag**: Optional timezone support with UTC fallback
- **Monitoring**: Track timezone header usage, validation errors, and user adoption
- **User Experience**: Seamless transition - users see no disruption, just better timezone handling

### Best Practices

#### For Developers

1. **Always store dates in UTC** in the database for consistency
2. **Use automatic timezone detection** on user login/registration
3. **Validate timezone inputs** using browser-compatible Intl API
4. **Test with different timezones** to ensure proper display and functionality
5. **Store user timezone preference** for future requests and consistency

#### For Users

1. **Automatic Detection**: The app automatically detects your timezone on login
2. **Manual Override**: Users can manually set timezone in user settings if needed
3. **Consistent Display**: All dates are shown in your local timezone
4. **Seamless Experience**: No manual configuration required for most users

### Implementation Notes

- **Browser Compatibility**: Uses standard `Intl.DateTimeFormat` API supported by all modern browsers
- **Server Validation**: Uses same validation method as client for consistency
- **Performance**: Minimal overhead - timezone detection happens once per session
- **Security**: Timezone strings are validated and sanitized before storage
- **Scalability**: Timezone handling scales with user base without performance impact
