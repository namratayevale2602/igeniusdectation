<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWithCookies
{
    public function handle(Request $request, Closure $next): Response
    {
        // If already authenticated, proceed
        if ($request->user()) {
            return $next($request);
        }

        // Try to authenticate via access_token cookie
        if ($accessToken = $request->cookie('access_token')) {
            $token = PersonalAccessToken::findToken($accessToken);
            
            if ($token && (!$token->expires_at || $token->expires_at->isFuture())) {
                auth()->setUser($token->tokenable);
            }
        }

        return $next($request);
    }
}


// namespace App\Http\Middleware;

// use Closure;
// use Illuminate\Http\Request;
// use Symfony\Component\HttpFoundation\Response;

// class AuthenticateWithCookies
// {
//     public function handle(Request $request, Closure $next): Response
//     {
//         // If there's no Authorization header but we have an access_token cookie
//         if (!$request->bearerToken() && $request->hasCookie('access_token')) {
//             $token = $request->cookie('access_token');
//             $request->headers->set('Authorization', 'Bearer ' . $token);
//         }

//         return $next($request);
//     }
// }