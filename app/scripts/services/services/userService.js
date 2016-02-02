'use strict';

/**
 * @ngdoc function
 * @name abacuApp.serives:userService
 * @description
 * # userService
 * Service of the abacuApp
 */

/*
 *
 */
angular.module('abacuApp')
  .service('User', ['$http', '$location', '$q', '$cookieStore', 'Order', 'Wheelchair', 'Units', 'Costs',
    function ($http, $location, $q, $cookieStore, Order, Wheelchair, Units, Costs) {

      var orders = [];     // TODO: only keep order variable.
      var currentWheelchair = {isNew: false, editingWheelchair: null};   // indicate the status of current design and hold the wheelchair instance
      var designedWheelchairs = [];     //array of chairs in cart
      var curEditWheelchairIndex = -1;  //Index associate with designedWheelchair i.e cartwheelchair
      var savedChairs = [];                    // array of saved wheelchair
      var savedChairIndex = -1;      //Index associate with savedchairs.
      var userID = -1; //-1 means not logged in
      var fName = '';
      var lName = '';
      var email = '';
      var phone = '';
      var addr = '';
      var addr2 = '';
      var city = '';
      var state = '';
      var zip = '';
      var unitSys = Units.unitSys.IMPERIAL;
      var contentSection = 'orders';
      var deferred = $q.defer();
      $http({
        url: '/session'
        , method: 'POST'
      })
        .success(function (data) {
          console.log(data);
          userID = data.userID;

          if (userID !== -1) {
            fName = data.fName;
            lName = data.lName;
            email = data.email;
            phone = data.phone;
            addr = data.addr;
            addr2 = data.addr2;
            city = data.city;
            state = data.state;
            zip = data.zip;

            for (var i = 0; i < data.orders.length; i++) {
              orders.push(new Order(0, 0, data.orders[i]));
            }
          }
          deferred.resolve();
        })
        .error(function (data) {
          console.log('Request Failed: ' + data);
          deferred.resolve();
        });

      //***************Cookie restore***********


      var wIndex = 0;
      while ($cookieStore.get('wheelchair' + wIndex)){
        designedWheelchairs.push(new Wheelchair($cookieStore.get('wheelchair' + wIndex)));
        wIndex ++;
      }

      var curOrder = new Order(Costs.TAX_RATE, Costs.SHIPPING_FEE, null);
      for (var j = 0; j < designedWheelchairs.length; j++) {
        if (designedWheelchairs[j].inCurOrder) {
          console.log(designedWheelchairs[j]);
          curOrder.wheelchairs.push(designedWheelchairs[j]);
        }
      }

      if (curOrder.wheelchairs.length > 0) {
        orders.push(curOrder);
      }

      var tempCurrentWheelchair = $cookieStore.get('currentWheelchair');
      if (tempCurrentWheelchair != null) {
        if (tempCurrentWheelchair.isNew === true) {
          createCurrentDesign(tempCurrentWheelchair.frameID);
        }
        else if (tempCurrentWheelchair.isNew === false) {
          setEditWheelchair(tempCurrentWheelchair.index);
        }
      }

      function createCurrentDesign(frameID) {
        currentWheelchair.editingWheelchair = new Wheelchair(frameID);
        currentWheelchair.isNew = true;
        $cookieStore.put('currentWheelchair', {frameID: frameID, isNew: true, index: -1});
      }

      function setEditWheelchair(index, orderInd) {
        if (index >= 0 && index < designedWheelchairs.length) {
          curEditWheelchairIndex = index;
        }
        console.log(designedWheelchairs[index]);
        currentWheelchair.editingWheelchair = $.extend(true, designedWheelchairs[index]);
        console.log(currentWheelchair.editingWheelchair);
        currentWheelchair.isNew = false;
        currentWheelchair.orderInd = orderInd;
        $cookieStore.put('currentWheelchair', {frameID: -1, isNew: false, index: index});
      }


//*********functions************//

      return {

        getPromise: function () {
          return deferred.promise;
        },

        allDetails: function () {
          var tempDesignedWheelchairs = [];
          for (var i = 0; i < designedWheelchairs.length; i++) {
            tempDesignedWheelchairs.push(designedWheelchairs[i].getAll());
          }

          var tempOrders = [];
          for (i = 0; i < orders.length; i++) {
            tempOrders.push(orders[i].getAll());
          }

          return {
            'userID': userID,
            'fName': fName,
            'lName': lName,
            'email': email,
            'phone': phone,
            'addr': addr,
            'addr2': addr2,
            'city': city,
            'state': state,
            'zip': zip,
            'unitSys': unitSys,
            'orders': tempOrders,
            'wheelchairs': tempDesignedWheelchairs
          }
        },

        /**********design share/coEdit with ID*********/
        fetchDesign:function(id) {
          return $http({
            url:'/design/' + id,
            data:{designID:id},
            method:'GET'
          })
          .then(function(data){
            console.log('fetch chair design' + JSON(data));
            //TODO load the design into current editing wheelchair variable
            var currentDesign = new Wheelchair(data);
            return currentDesign;
          }, function(data){
              console.log("fetch failed")
            });
        },

        saveDesign:function(wheelchair) {
          // $http({ ... }) returns a promise
          return $http({
            url:'/design',
            data: wheelchair,
            method: 'POST'
          });
        },

        /************************LOGIN AND LOGOUT****************************/

        //Attempt to login as the given username with the given password
        //If successful - should load in appropriate user data
        login: function (in_email, pass) {

          var deferred = $q.defer();
          var curThis = this;
          $http({
            url: '/login'
            , data: {email: in_email, password: pass}
            , method: 'POST'
          }).success(function (data) {
            console.log(data);
            userID = data.userID;
            if (userID !== -1) {
              deferred.resolve();
              fName = data.fName;
              lName = data.lName;
              email = in_email;
              phone = data.phone;
              addr = data.addr;
              addr2 = data.addr2;
              city = data.city;
              state = data.state;
              zip = data.zip;

              var curOrder = curThis.getCurEditOrder();
              orders = [];

              for (var i = 0; i < data.orders.length; i++) {
                orders.push(new Order(0, 0, data.orders[i]));
              }

              if (curOrder) {
                orders.push(curOrder);
              }
            }
            else
              deferred.reject('Incorrect email or password');
          })
            .error(function (data) {
              console.log('Request Failed: ' + data);
              deferred.reject('Error loading user data');
            });
          return deferred.promise;
        },

        logout: function () {
          userID = -1; //-1 means not logged in
          fName = '';
          lName = '';
          email = '';
          phone = '';
          addr = '';
          addr2 = '';
          city = '';
          state = '';
          zip = '';
          unitSys = Units.unitSys.IMPERIAL;
          var curOrder = this.getCurEditOrder();
          orders = [];
          if(curOrder){
            orders.push(curOrder);
          }
          designedWheelchairs = [];
          curEditWheelchairIndex = -1;
          $http({
            url: '/logout',
            method: 'POST'
          }).success(function (data) {
            console.log(data);
          })
            .error(function (data) {
              console.log('Request Failed: ' + data);
            });
        },

        //Returns true if the user is logged in
        isLoggedIn: function () {
          return (userID !== -1);
        },

        updateDB: function () {
          if (userID !== -1) {
            $http({
              url: '/update',
              data: this.allDetails(),
              method: 'POST'
            }).success(function (data) {
              console.log(data);
            })
              .error(function (data) {
                console.log('Request Failed: ' + data);
              });
          }
        },

        updateCookie: function () {
          console.log('wheelchair'+designedWheelchairs.length);
          $cookieStore.remove('wheelchair'+designedWheelchairs.length);
          for (var i = 0; i < designedWheelchairs.length; i++) {
            $cookieStore.put('wheelchair' + i, designedWheelchairs[i].getAll());
          }
        },


        /*************************MY DESIGNS*******************************/

        createCurrentDesign: createCurrentDesign,

        //Create a new wheelchair object of given frame type and set edit pointer to it
        pushNewWheelchair: function () {
          if (currentWheelchair.isNew === true && designedWheelchairs.length < 3) {
            designedWheelchairs.push(currentWheelchair.editingWheelchair);
            curEditWheelchairIndex = designedWheelchairs.length - 1;

          }
          else if (currentWheelchair.isNew === false) {
            designedWheelchairs[curEditWheelchairIndex] = $.extend(true, currentWheelchair.editingWheelchair);
            var order = this.getCurEditOrder();
            if(order && currentWheelchair.orderInd >= 0) {
              order.wheelchairs[currentWheelchair.orderInd] = designedWheelchairs[curEditWheelchairIndex];
            }
          }
          else
            alert('You may only save 3 wheelchairs');
          this.updateCookie();
        },

        //Set the given wheelchair index to be edited
        setEditWheelchair: setEditWheelchair,

        //Removes the wheelchair at the given index from the user's myDesign
        deleteWheelchair: function (index) {
          designedWheelchairs.splice(index, 1);
          this.updateCookie();
        },

        //Returns the full array of user-defined wheelchairs
        getDesignedWheelchairs: function () {
          return designedWheelchairs;
        },

        getWheelchair: function (index) {
          if (index >= 0 && index < designedWheelchairs.length)
            return designedWheelchairs[index];
          return null;
        },

        //Returns the wheelchair currently set as "curEditWheelchair"
        //Returns null if no chair set as curEditWheelchair
        getCurEditWheelchair: function () {
          return currentWheelchair.editingWheelchair;
        },

        isNewWheelchair: function () {
          return currentWheelchair.isNew;
        },

        getNumDesignedWheelchairs: function () {
          return designedWheelchairs.length;
        },

        saveComputer: function () {
          var curThis = this;
          $http.post('/save', {wheelchair: this.getCurEditWheelchair().getAll()}, {responseType: 'blob'})
            .success(function (response) {
              saveAs(response, curThis.getCurEditWheelchair().title+'.pdf');
            });
        },
        /******************************MY MEASUREMENTS*******************************/

        commonMeasures: {
          REAR_SEAT_HEIGHT: -1,
          REAR_SEAT_WIDTH: -1,
          FOLDING_BACKREST_HEIGHT: -1,
          AXEL_POSITION: -1,
          SEAT_DEPTH: -1
        },


        /******************************MY ORDERS*******************************/

        getAllOrders: function () {
          return orders;
        },
        getNumOrders: function () {
          return orders.length;
        },

        //Returns an array of all orders that have been sent (ignores "unsent" orders)
        getSentOrders: function () {
          var sentOrders = orders;
          if (sentOrders.length > 0) {
            var lastOrder = sentOrders[sentOrders.length - 1];
            if (!lastOrder.hasBeenSent())
              sentOrders.splice(sentOrders.length - 1, 1);
          }
          return sentOrders;
        },

        //Creates a new "unsent" order - overwriting a previous unset order if one exists
        createNewOrder: function () {
          var lastOrder = orders[orders.length - 1];
          if (orders.length === 0 || lastOrder.hasBeenSent()) {
            console.log("create a new order")
            var newOrder = new Order(Costs.TAX_RATE, Costs.SHIPPING_FEE, null);
            orders.push(newOrder);
          }
        },

        //Returns the unsent Order set as the "curEditOrder"
        //If no such Order exists, returns null
        getCurEditOrder: function () {
          console.log(orders.length);
          if (orders.length > 0) {
            var lastOrder = orders[orders.length - 1];
            if (!lastOrder.hasBeenSent())
              return lastOrder;
          }
          return null;
        },

        //Returns the last order whether it is sent or unsent
        getLastOrder: function () {
          if (orders.length > 0) {
            return orders[orders.length - 1];
          }
        },

        //Sends the curEditOrder to the distributor
        sendCurEditOrder: function (userData, shippingData, payMethod, token) {
          var deferred = $q.defer();

          var editOrder = this.getCurEditOrder();
          if (editOrder === null)
            deferred.reject('CurEditOrder does not exist');

          editOrder.send(userID, userData, shippingData, payMethod, token)
            .then(function () {
              deferred.resolve();
            }, function (err) {
              deferred.reject(err);
            });

          return deferred.promise;
        },

        //***********get/sets
        getFname: function () {
          return (fName.charAt(0).toUpperCase() + fName.slice(1));
        },
        getLname: function () {
          return (lName.charAt(0).toUpperCase() + lName.slice(1));
        },
        getEmail: function () {
          return email;
        },
        getPhone: function () {
          return phone;
        },
        getAddr: function () {
          return addr;
        },
        getAddr2: function () {
          return addr2;
        },
        getCity: function () {
          return city;
        },
        getState: function () {
          return state;
        },
        getZip: function () {
          return zip;
        },
        getUnitSys: function () {
          return unitSys;
        },

        getFullName: function () {
          return this.getFname() + ' ' + this.getLname();
        },
        getFullAddr: function () {
          var a2 = addr2;
          if (addr2 !== '')
            a2 = ' ' + a2;
          return addr + a2;
        },
        getContentSection: function () {
          return contentSection;
        },
        setFname: function (newFName) {
          fName = newFName;
        },
        setLname: function (newLName) {
          lName = newLName;
        },
        setEmail: function (newEmail) {
          email = newEmail;
        },
        setPhone: function (newPhone) {
          phone = newPhone;
        },
        setAddr: function (newAddr) {
          addr = newAddr;
        },
        setAddr2: function (newAddr2) {
          addr2 = newAddr2;
        },
        setCity: function (newCity) {
          city = newCity;
        },
        setState: function (newState) {
          state = newState;
        },
        setZip: function (newZip) {
          zip = newZip;
        },
        setUnitSys: function (newUnitSys) {
          unitSys = newUnitSys;
        },
        setContentSection: function (newSection) {
          contentSection = newSection;
        }
      };

    }])
;



