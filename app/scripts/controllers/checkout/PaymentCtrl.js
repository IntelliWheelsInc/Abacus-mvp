'use strict';

angular.module('abacuApp')
  .controller('PaymentCtrl', ['$scope', 'User', '$routeParams', 'PAYMENT_TYPES', 'StripeKeys', 'PaymentAPI', 
    function($scope, User, $routeParams, PAYMENT_TYPES, StripeKeys, PaymentAPI) {
    var payment = this;
    var orders = User.getSentOrders()

    payment.orderNum = $routeParams.orderNum;
    payment.invalidInputs = false;
    orders.forEach(function(order) {
      if (order.orderNum === parseInt(payment.orderNum)) return payment.paymentOrder = order;
    })
    payment.paymentOrder.totalDueNow = payment.paymentOrder.totalDueLater;
    payment.PAYMENT_TYPES = PAYMENT_TYPES;

    payment.makePayment = function() {
      if (payment.paymentOrder.payType === 'Credit Card') {
        stripePayment();
      } else {
        createPayment();
      }
    }

    payment.adminFiler = function(item) {
      if (item.requiresAdmin) {
        return User.getUserType() === 'admin' || User.getUserType() === 'superAdmin';
      }

      return true;
    };

    payment.setChecker = function(payType) {
      if (payType === payment.paymentOrder.payType) return true;
      return false;
    }

    payment.choosePaymentType = function(payType) {
      payment.paymentOrder.payType = payType;
    }

    $scope.$watch('payment.paymentOrder.totalDueNow', function(n, o) {
      if (n > payment.paymentOrder.totalDueLater || n < 0) {
        payment.invalidInputs = true;
        return payment.errorMsg = 'Please enter a value between 0 and ' + payment.paymentOrder.totalDueLater;
      }
      payment.invalidInputs = false;
      return payment.errorMsg = '';
    })

    function stripePayment(){
      Stripe.setPublishableKey(StripeKeys.PUBLISHABLE_KEY);
      Stripe.card.createToken(payment.userCard, stripeResponseHandler);
    }

    function stripeResponseHandler(status, response) {
      if (response.error) {
        payment.errorMsg = response.error.message;
        $scope.$apply()
      } else {
        payment.token = response.id;
        createPayment();
      }
    }

    function createPayment() {
      return PaymentAPI.createPayment(payment.paymentOrder.totalDueNow, payment.paymentOrder.payType, payment.token, payment.paymentOrder, payment.userCard, payment.checkNum, payment.memo)
      .then(function() {
        payment.successMsg = 'Payment created successfully.';
        payment.userCard = {};
      })
      .catch(function(err) {
        payment.errorMsg = err.message;
      });
    }
  }]);
