﻿angular.module("umbraco").controller("FormEditor.Editor.DataController", ["$scope", "$filter", "assetsService", "dialogService", "angularHelper", "formEditorPropertyEditorResource", "editorState",
  function ($scope, $filter, assetsService, dialogService, angularHelper, formEditorPropertyEditorResource, editorState) {
    assetsService.loadCss("/App_Plugins/FormEditor/css/form.css");

    // hide the property label?
    $scope.model.hideLabel = $scope.model.config.hideLabel == 1;

    // default sorting by date descending 
    $scope.model.sortField = "_created";
    $scope.model.sortDescending = true;

    $scope.model.value = $scope.model.value || {};

    $scope.actionInProgress = false;
    $scope.dataState = "loading";

    $scope.expandedState = {
      visibleFields: {
        expanded: false
      }
    };

    $scope.hasSelection = function () {
      return _.find($scope.model.data.rows, function (row) {
        return row.selected == true;
      }) != null;
    }

    $scope.selectAll = function () {
      var select = !$scope.allSelected();
      _.each($scope.model.data.rows, function (row) {
        row.selected = select;
      });
    }

    $scope.allSelected = function () {
      return _.find($scope.model.data.rows, function (row) {
        return row.selected == false;
      }) == null;
    }

    $scope.getSelectedIds = function () {
      var ids = [];
      _.each($scope.model.data.rows, function (row) {
        if (row.selected == true) {
          ids.push(row._id);
        }
      });
      return ids;
    }

    $scope.getDocumentId = function () {
      return editorState.current.id;
    }

    $scope.sort = function (fieldName) {
      if ($scope.model.sortField == fieldName) {
        $scope.model.sortDescending = !$scope.model.sortDescending;
      }
      else {
        $scope.model.sortField = fieldName;
        $scope.model.sortDescending = false;
      }
      $scope.loadPage($scope.model.data.currentPage);
    }

    $scope.goToPage = function (page) {
      if (page <= 0 || page > $scope.model.data.totalPages || page == $scope.model.data.currentPage) {
        return;
      }

      $scope.loadPage(page);
    }

    $scope.loadPage = function (page) {
      formEditorPropertyEditorResource.getData(editorState.current.id, page, $scope.model.sortField, $scope.model.sortDescending).then(function (data) {

        if (data == null || data.rows == null || data.rows.length == 0) {
          $scope.model.data = null;
          $scope.dataState = "no-data";
          return;
        }

        _.each(data.rows, function (row) {
          row.selected = false;
          // for reasons unknown the view messes up in-view date filters on documet save, so we'll execute the filters on load and use local properties per row
          row._createdDateShort = $filter("date")(row._createdDate, "yyyy-MM-dd");
          row._createdDateLong = $filter("date")(row._createdDate, "yyyy-MM-dd HH:mm:ss");
        });

        data.pages = [];
        for (var i = 1; i <= data.totalPages; i++) {
          data.pages.push(i);
        }

        $scope.actionInProgress = false;
        $scope.dataState = "data";
        $scope.model.data = data;

        // default to all fields visible
        if (!$scope.model.value.visibleFields) {
          $scope.model.value.visibleFields = [];
          _.each($scope.model.data.fields, function (field) {
            $scope.model.value.visibleFields.push(field.name);
          });
        }
        // clean up any fields that have been deleted from the form
        $scope.model.value.visibleFields = $filter("filter")($scope.model.value.visibleFields, function (fieldName, index, array) {
          return _.find($scope.model.data.fields, function (field) {
            return field.name == fieldName;
          }) != null;
        });
      });
    }

    $scope.deleteSelected = function () {
      var ids = $scope.getSelectedIds();
      if (ids.length == 0) {
        return;
      }

      $scope.actionInProgress = true;

      formEditorPropertyEditorResource.deleteData(editorState.current.id, ids).then(function (data) {
        $scope.loadPage($scope.model.data.currentPage);
      });
    }

    $scope.viewEntry = function (index) {
      if ($scope.hasHiddenFields() == false) {
        return;
      }
      dialogService.open({
        dialogData: {
          row: $scope.model.data.rows[index],
          fields: $scope.model.data.fields
        },
        template: "data.viewEntry.html"
      });
    }

    $scope.isFieldVisible = function (field) {
      return !$scope.model.value.visibleFields || $scope.model.value.visibleFields.indexOf(field.name) >= 0;
    }

    $scope.hasHiddenFields = function () {
      return $scope.model.value.visibleFields && $scope.model.value.visibleFields.length !== $scope.model.data.fields.length;
    }

    $scope.toggleFieldVisible = function (field) {
      var index = $scope.model.value.visibleFields.indexOf(field.name);
      if (index >= 0) {
        $scope.model.value.visibleFields.splice(index, 1);
      }
      else {
        $scope.model.value.visibleFields.push(field.name);
      }
      $scope.setDirty();
    }

    // helper to force the current form into the dirty state
    $scope.setDirty = function () {
      angularHelper.getCurrentForm($scope).$setDirty();
    }

    $scope.loadPage(1);
  }
]);
