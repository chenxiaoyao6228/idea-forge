import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * LocalAuthGuard is an authentication guard based on passport-local strategy
 *
 * Main functions:
 * 1. Protects routes that require username/password login
 * 2. When a request reaches a route protected by this guard, it automatically calls the validate method of passport-local strategy
 * 3. The validate method verifies if the provided credentials (username/password) are correct
 * 4. If validation succeeds, user information is added to request.user
 * 5. If validation fails, throws a 401 Unauthorized exception
 *
 * Usage example:
 * @UseGuards(LocalAuthGuard)
 * @Post('login')
 * async login(@Request() req) {
 *   // req.user contains the validated user information
 * }
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {}
