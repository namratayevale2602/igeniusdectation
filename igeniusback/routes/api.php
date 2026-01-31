<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\LevelController;
use Illuminate\Support\Facades\Route;


// Public routes (only these should be accessible without login)
Route::get('/sanctum/csrf-cookie', function () {
    return response()->json(['message' => 'CSRF cookie set']);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// ALL other API routes are protected
Route::middleware([\App\Http\Middleware\SanctumCookieAuth::class])->group(function () {
    
    // Auth routes
    Route::get('/check-auth', [AuthController::class, 'checkAuth']);
    Route::get('/csrf-token', [AuthController::class, 'getCsrfToken']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::prefix('levels')->group(function () {
        Route::get('/', [LevelController::class, 'index']);
        Route::get('/{level:slug}', [LevelController::class, 'show']);
        Route::get('/{level:slug}/weeks', [LevelController::class, 'getWeeks']);
        Route::get('/{level:slug}/weeks/{week}', [LevelController::class, 'getWeekQuestionSets']);
         Route::get('/{level}/weeks/{week}/question-sets', [LevelController::class, 'getWeekQuestionSets']);
        Route::get('/{level:slug}/weeks/{week}/question-sets/{questionSet}', [LevelController::class, 'getQuestionSetQuestions']);
        Route::get('/{level}/weeks/{week}/question-sets/{questionSet}/questions', [LevelController::class, 'getQuestionSetQuestions']);
    });

    // Admin routes
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'getStats']);
        Route::post('/create-admin', [AuthController::class, 'createAdminUser']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::get('/users/{id}', [AdminController::class, 'getUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
    });
});

// Filament admin routes (separate, for admin panel only)
Route::middleware(['web', 'auth'])->group(function () {
    // Filament admin routes will be handled by Filament itself
});
