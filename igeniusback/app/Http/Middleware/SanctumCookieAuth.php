<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class SanctumCookieAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        // Allow preflight requests
        if ($request->isMethod('OPTIONS')) {
            return $next($request);
        }

        // If user is already authenticated, proceed
        if ($request->user()) {
            return $next($request);
        }

        $user = null;
        $tokenRefreshed = false;
        $newAccessToken = null;

        // Method 1: Check Bearer Token (for API clients)
        if ($bearerToken = $request->bearerToken()) {
            $token = PersonalAccessToken::findToken($bearerToken);
            if ($token && $this->isTokenValid($token)) {
                $user = $token->tokenable;
                auth()->setUser($user);
                return $next($request);
            }
        }

        // Method 2: Check Access Token Cookie (for web frontend)
        if ($accessToken = $request->cookie('access_token')) {
            $token = PersonalAccessToken::findToken($accessToken);
            
            if ($token) {
                if ($this->isTokenValid($token)) {
                    $user = $token->tokenable;
                    auth()->setUser($user);
                } else {
                    // Access token is expired, try to refresh it
                    $user = $this->attemptTokenRefresh($request);
                    if ($user) {
                        auth()->setUser($user);
                        $tokenRefreshed = true;
                        $newAccessToken = $user->newAccessToken;
                    }
                }
            }
        }

        // Method 3: If no access token, try refresh token directly
        if (!$user && ($refreshToken = $request->cookie('refresh_token'))) {
            $user = $this->attemptTokenRefresh($request);
            if ($user) {
                auth()->setUser($user);
                $tokenRefreshed = true;
                $newAccessToken = $user->newAccessToken;
            }
        }

        // Check if authentication succeeded
        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'Please login to access this resource'
            ], 401);
        }

        // Process the request
        $response = $next($request);

        // If token was refreshed, set the new access token cookie
        if ($tokenRefreshed && $newAccessToken) {
            $response = $this->addTokenCookie($response, $newAccessToken);
        }

        return $response;
    }

    private function isTokenValid($token): bool
    {
        if (!$token) {
            return false;
        }
        
        // Check if token has expired
        if ($token->expires_at && $token->expires_at->isPast()) {
            return false;
        }
        
        return true;
    }

    private function attemptTokenRefresh(Request $request)
    {
        try {
            $refreshToken = $request->cookie('refresh_token');
            
            if (!$refreshToken) {
                return null;
            }

            $token = PersonalAccessToken::findToken($refreshToken);
            
            if (!$token) {
                return null;
            }

            // Verify this is a refresh token
            if (!$token->can('refresh')) {
                return null;
            }

            $user = $token->tokenable;

            // Check if refresh token is expired
            if ($token->expires_at && $token->expires_at->isPast()) {
                $token->delete();
                return null;
            }

            // Revoke old access tokens
            $user->tokens()->where('name', 'access_token')->delete();

            // Create new access token (60 minutes)
            $newAccessToken = $user->createToken('access_token', ['*'], now()->addMinutes(60))->plainTextToken;

            // Store the new token on the user object temporarily
            $user->newAccessToken = $newAccessToken;

            return $user;

        } catch (\Exception $e) {
            \Log::error('Token refresh failed: ' . $e->getMessage());
            return null;
        }
    }

    private function addTokenCookie($response, $token)
    {
        $isLocal = app()->environment('local');
        $domain = $isLocal ? 'localhost' : parse_url(env('FRONTEND_URL'), PHP_URL_HOST);
        
        return $response->cookie(
            'access_token',
            $token,
            60, // 60 minutes
            '/',
            $domain,
            !$isLocal, // secure in production
            false, // httpOnly - set to false for debugging, true in production
            false,
            $isLocal ? 'lax' : 'none'
        );
    }
}