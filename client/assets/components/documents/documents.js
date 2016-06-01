(function () {
  'use strict';

  angular
    .module('searchHub.components.documents', ['lucidworksView.services.config',
      'ngOrwell', 'lucidworksView.services.landingPage'
    ])
    .directive('documents', documents);

  function documents() {
    'ngInject';
    return {
      restrict: 'EA',
      templateUrl: 'assets/components/documents/documents.html',
      controller: Controller,
      controllerAs: 'vm',
      bindToController: {},
      scope: true,
      replace: true
    };

  }


  function Controller($sce, $anchorScroll, Orwell, SnowplowService, IDService, QueryService, $log) {
    'ngInject';
    var vm = this;
    vm.docs = [];
    vm.highlighting = {};
    vm.getDocType = getDocType;
    vm.groupedResults = false;
    vm.toggleGroupedResults = toggleGroupedResults;
    vm.decorateDocument = decorateDocument;
    vm.showGroupedResults = {};

    activate();

    ////////

    function activate() {
      var resultsObservable = Orwell.getObservable('queryResults');
      resultsObservable.addObserver(function (data) {
        //Every time a query is fired and results come back, this section gets called
        var queryObject = QueryService.getQueryObject();
        //let's make sure we can track individual query/result pairs by assigning a UUID to each unique query
        queryObject["uuid"] = IDService.generateUUID();
        $log.info("Query Obj:");
        $log.info(queryObject);
        $log.info("see data");
        $log.info(data);

        data=testFunction(data,queryObject,1,30);
        $log.info("see data again");
        $log.info(data);

        vm.docs = parseDocuments(data);
        $log.info("take a look at docs");
        $log.info(vm.docs);

        //add transformed body

        vm.highlighting = parseHighlighting(data);
        $log.info("see what's in highlighting");
        $log.info(vm.highlighting);
        vm.getDoctype = getDocType;
        $anchorScroll('topOfMainContent');
      });
    }

    /**
     * Get the document type for the document.
     * @param  {object} doc Document object
     * @return {string}     Type of document
     */
    function getDocType(doc){
      // Change to your collection datasource type name
      // if(doc['_lw_data_source_s'] === 'MyDatasource-default'){
      //   return doc['_lw_data_source_s'];
      // }
      var ds = doc['_lw_data_source_s'];
      if (ds){
        if (ds.indexOf("github-lucidworks-fusion-docs") != -1){
          return "lucid-docs";
        }
        var idx = ds.indexOf("-");
        if (idx != -1){
          return ds.substring(0, idx)
        }
      }
      //if we can't figure out the data source name, then let's use the type
      return doc['_lw_data_source_type_s'];
    }

    /**
     * Decorates the document object before sending to the document directive.
     * @param  {object} doc Document object
     * @return {object}     Document object
     */
    function decorateDocument(doc){
      return doc;
    }

    function isNotGrouped(data){
      return _.has(data, 'response');
    }
    function isGrouped(data){
      return _.has(data, 'grouped');
    }
    /**
     * Get the documents from
     * @param  {object} data The result data.
     * @return {array}       The documents returned
     */
    function parseDocuments(data){
      var docs = [];
      if (isNotGrouped(data)) {
        docs = data.response.docs;
      }
      else if(isGrouped(data)){
        vm.groupedResults = data.grouped;
        parseGrouping(vm.groupedResults);
      }
      //$log.info("docs: "+ docs.length);
      if (docs.length > 0){
        //we have docs, let's send over a signal of the query and all the doc ids
        var queryObject = QueryService.getQueryObject();
        SnowplowService.postSearchSignal(queryObject,
            data.responseHeader.params.fq,
          data.response.numFound,
          data.response.docs
          )
      }
      return docs;
    }


    function toggleGroupedResults(toggle){
      vm.showGroupedResults[toggle] = !vm.showGroupedResults[toggle];
    }

    function parseGrouping(results){
      _.each(results, function(item){
        _.each(item.groups, function(group){
          if(_.has(group, 'groupValue') && group.groupValue !== null){
            vm.showGroupedResults[group.groupValue] = false;
          }
          else{
            vm.showGroupedResults['noGroupedValue'] = true;
          };
        });
      });
    }

    /**
     * Get highlighting from a document.
     * @param  {object} data The result data.
     * @return {object}      The highlighting results.
     */
    function parseHighlighting(data) {
      if (data.hasOwnProperty('highlighting')){
        _.each(data.highlighting, function(value, key){
          var vals = {};
          if (value) {
            _.each(Object.keys(value), function (key) {
              //$log.debug('highlight', value);
              var val = value[key];
              _.each(val, function(high){
                vals[key] = $sce.trustAsHtml(high);
              });
            });
            vm.highlighting[key] = vals;
          }
        });
      }
      else{
        vm.highlighting = {};
      }
      return vm.highlighting;
    }


    function testFunction(data,q,skip,snippetLen){
      q=q['q'];
      _.each(data.highlighting, function(value,key){
        $log.info("see original");
        $log.info(value['body']+'');

        if(value['body']){
          var para=value['body'];
        }
        else{
          var para=data.
        }




        if(value['body']){
          var splittedIntoArray=(value['body'][0]).split(/[\s]+/);
          $log.info(splittedIntoArray);
          var containHighlight=splittedIntoArray.map(a=>a.toLowerCase().includes(q.toLowerCase()));
          $log.info(containHighlight);
          var paraLength=containHighlight.length;
          $log.info(paraLength);
          var max=0;
          var maxind=0;
          var i=0;
          while (i+snippetLen<=paraLength){
            //$log.info("checkpoint");
            var tmp = containHighlight.slice(i,i+snippetLen).reduce((a, b) => a + b, 0);
            if(tmp>max){
              max=tmp;
              maxind=i;
            }
            i=i+skip;
          }
          $log.info("see output");
          $log.info(splittedIntoArray.slice(maxind,maxind+snippetLen).join(" "));
          value['shortbody']=[splittedIntoArray.slice(maxind,maxind+snippetLen).join(" ")];
        }
        else{
          $log.info("not captured");
        }
      });
      return data;
    }



  }
})();
