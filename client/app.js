var myApp = angular.module('myApp', []);

var videoCtrlScope;
var rootScope;
var filterInput = document.getElementById('filterInput');

var filterList = document.getElementById('filterList');
var content = document.getElementById('content');
window.onhashchange = function() {
	window.scrollTo(0, 0);

	videoCtrlScope.filterArray = [];
	var hash = location.hash;
	
	if (hash.length > 1) {
		rootScope.filterArray = JSON.parse(hash.substr(1));
		rootScope.$apply();
	} else {
		rootScope.filterArray = [];
		rootScope.$apply();		
	}
	
	var calc = 'calc(150px + 5px + ' + filterList.offsetHeight + 'px)';
	console.log("height : " + filterList.offsetHeight);
	content.style.marginTop = calc;
};

myApp.controller('VideoCtrl', ['$rootScope', '$scope', '$http', function ($rootScope, $scope, $http) {
	rootScope = $rootScope;
	videoCtrlScope = $scope;
	$rootScope.avinfo = {};
	$rootScope.filterArray = [];

	loadList($http);

	var hash = location.hash;
	
	if (hash.length > 1) {
		$rootScope.filterArray = JSON.parse(hash.substr(1));
	}

	$scope.videoFilter = function (item) {
		if ($rootScope.filterArray.length == 0) {
			return true;
		} else {
			for (i = 0; i < $rootScope.filterArray.length; i++) {
				var value = $rootScope.filterArray[i];
				if (value.type == 'a') {
					if (!item['배우'] || item['배우'].indexOf(value.value) < 0) {
						return false;
					}
				} else if (value.type == 'g'){
					if (!item['장르'] || item['장르'].indexOf(value.value) < 0) {
						return false;
					}
				}
			}
			
			
			
			return true;
		}
		
    };

}]);

myApp.directive('deleteButton', function ($http) {
  return {
    restrict: 'A',
    replace: true,
    transclude: true,
    template: '<a href="" class="myawesomebutton" ng-transclude>' +
                '<i class="icon-ok-sign"></i>' +
              '</a>',
    link: function (scope, element, attrs) {
		element.bind('click', 
			function() {
				if (confirm('Delete ' + scope.video.key + '?')) {
					console.log('clicked');
					console.log(scope.video.key);
					$http({
						method: 'DELETE',
						url: '//' + location.host + '/video/' + scope.video.key
					})
					.success(function(data, status, headers, config) {
						location.reload();
					})
					.error(function(data, status, headers, config) {
						// do nothing
					});
				}
			}
		);
	}
  };
});

myApp.directive('openButton', function ($http) {
  return {
    restrict: 'A',
    replace: true,
    transclude: true,
    template: '<a href="" class="myawesomebutton" ng-transclude>' +
                '<i class="icon-ok-sign"></i>' +
              '</a>',
    link: function (scope, element, attrs) {
		element.bind('click', 
			function() {
				console.log('clicked');
				console.log(scope.video.key);
				$http({
					method: 'POST',
					url: '//' + location.host + '/video/' + scope.video.key
				})
				.success(function(data, status, headers, config) {
					// do nothing
				})
				.error(function(data, status, headers, config) {
					// do nothing
				});
			}
		);
	}
  };
});

myApp.directive('playButton', function ($http) {
  return {
    restrict: 'A',
    replace: true,
    transclude: true,
    template: '<a href="" class="myawesomebutton" ng-transclude>' +
                '<i class="icon-ok-sign"></i>' +
              '</a>',
    link: function (scope, element, attrs) {
		element.bind('click', 
			function() {
				console.log('clicked');
				console.log(scope.video.key);
				$http({
					method: 'GET',
					url: '//' + location.host + '/video/' + scope.video.key
				});
			}
		);
	}
  };
});

var t;
myApp.directive('actorButton', function ($http) {
  return {
    restrict: 'A',
    replace: true,
    transclude: false,
    template: '<span><button></button><t></t><a target="_blank"></a></span>',
    link: function (scope, element, attrs) {

		var child = element.children();
		
		var link = child[0];
		var middle = child[1];
		var extnalLink = child[2];
		t = link;
		if (scope.video.actor && scope.video.actor.length == 3) {
			link.textContent = scope.video.actor[0];
			middle.textContent = " - ";
			extnalLink.textContent = scope.video.actor[2];
			extnalLink.href = 'http://hentaku.net/star/' + scope.video.actor[0].replace(/ /g, '');
			link.onclick =  
				function() {
					var actor = scope.video.actor[2].split(' ')[0];
					var filterArray = [];
					
					var hash = location.hash;
					if (hash.length > 1) {
						filterArray = filterArray.concat(JSON.parse(hash.substr(1)));
					}
					
					filterArray.push({'type' : 'a', 'value' : actor});
					location.hash = JSON.stringify(filterArray);
				};
		} else {
			link.style.display = 'none';
			middle.textContent = scope.video['배우'];
		}
	}
  };
});


myApp.directive('genreButton', function ($http) {
  return {
    restrict: 'A',
    replace: true,
    transclude: true,
    template: '<button href="" ng-transclude></button>',
    link: function (scope, element, attrs) {
		element.bind('click', 
			function() {
				console.log('clicked');
				console.log(scope.video.key);
//				loadList($http, 'genre=' + scope.genre);
				var filterArray = [];
				var hash = location.hash;
				if (hash.length > 1) {
					filterArray = filterArray.concat(JSON.parse(hash.substr(1)));
				}

				filterArray.push({'type' : 'g', 'value' : scope.genre});
				location.hash = JSON.stringify(filterArray);
			}
		);
	}
  };
});

myApp.directive('filterButton', function ($http) {
  return {
    restrict: 'A',
    replace: true,
    transclude: true,
    template: '<button href="" ng-transclude></button>',
    link: function (scope, element, attrs) {
		element.bind('click', 
			function() {
				var toDelete = {'type':scope.filter.type,'value':scope.filter.value};
				console.log('clicked');
				console.log(toDelete);
//				loadList($http, 'genre=' + scope.genre);
				var filterArray = [];
				var hash = location.hash;
				if (hash.length > 1) {
					filterArray = filterArray.concat(JSON.parse(hash.substr(1)));
				}

				for (var i = 0; i < filterArray.length; i++) {
					if ((filterArray[i].type == toDelete.type) && (filterArray[i].value == toDelete.value)) {
						filterArray.splice(i, 1);
						break;
					}
				}

				location.hash = JSON.stringify(filterArray);
			}
		);
	}
  };
});

function loadList($http, searchQuery) {
  $http({
    method: 'GET',
    url: '//' + location.host + '/video' + (!searchQuery ? "" : "?" + searchQuery)
  }).success(function (data, status, headers, config) {
  console.log("STATUS : " + status);
  console.log("DATA : " + data);
    // 성공! 데이터를 가져왔어
	videoCtrlScope.avinfo.data = data.data;
  })
  .error(function (data, status, headers, config) {
    // 이런. 뭔가 잘못되었음! :(
  });
}
