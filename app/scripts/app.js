'use strict';

/**
 * @ngdoc overview
 * @name abacuApp
 * @description
 * # abacuApp
 *
 * Main module of the application.
 */
angular
  .module('abacuApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($routeProvider, $sceDelegateProvider, $httpProvider, $locationProvider) {

    $routeProvider
      .when('/', {
        templateUrl: 'views/landing.html',
        controller: 'LandingCtrl'
      })
      .when('/frames', {
        templateUrl: 'views/frame.html',
        controller: 'FrameCtrl'
      })
      .when('/tinker', {
        templateUrl: 'views/abacus.html',
        controller: 'AbacusCtrl'
      })
      .when('/abacus/:param1', {
        templateUrl: 'views/abacus.html',
        controller: 'AbacusCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .when('/cart', {
        templateUrl: 'views/checkout/cart.html',
        controller: 'CartCtrl',
        resolve: {UserData: ['$q', 'User', function($q, User){
          return User.getPromise();
        }]}
      })
      .when('/checkout', {
        templateUrl: 'views/checkout/checkout.html',
        controller: 'CheckoutCtrl'
      })
      .when('/order', {
        templateUrl: 'views/checkout/order.html',
        controller: 'OrderCtrl'
      })
      .when('/settings', {
        templateUrl: 'views/settings.html',
        controller: 'SettingsCtrl',
        resolve: {UserData: ['$q', 'User', function($q, User){
          return User.getPromise();
        }]}
      })
      .when('/save', {
        templateUrl: 'views/save.html',
        controller: 'SaveCtrl'
      })
      .when('/register', {
        templateUrl: 'views/register/register.html',
        controller: 'RegisterCtrl'
      })
      .when('/confirm/:param1', {
        templateUrl: 'views/confirm.html',
        controller: 'ConfirmCtrl'
      })
      .when('/welcome', {
        templateUrl: 'views/register/welcome.html',
        controller: 'WelcomeCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });

    //Allow Youtube URLs to load
    $sceDelegateProvider.resourceUrlWhitelist([
      'self',
      'https://www.youtube.com/embed/**',
      'http://www.youtube.com/embed/**'
    ]);
    $httpProvider.defaults.useXDomain = true;

    $locationProvider.hashPrefix('!');
    $locationProvider.html5Mode(true);



  });

