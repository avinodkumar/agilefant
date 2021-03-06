var StoryController = function StoryController(model, view, backlogController) {
  this.model = model;
  this.view = view;
  this.parentController = backlogController;
  this.init();
  this.autohideCells = [ "labels", "description", "buttons" ]; 
};

StoryController.columnNames =
  ["priority", "labelsIcon", "id", "name", "value", "points", "state", "responsibles", "el", "es", "actions", "labels", "description", "buttons", "details", "tasksData"];
StoryController.columnIndices = CommonController.createColumnIndices(StoryController.columnNames);


StoryController.prototype = new CommonController();

StoryController.prototype.handleModelEvents = function(event) {
  if(this.parentController) {
    this.parentController.handleModelEvents(event);
  }
  //reload model to update metrics if tasks haven been added or 
  //removed within the story.
  if (event instanceof DynamicsEvents.RelationUpdatedEvent && event.getRelation() === "task" && this.view) {
    this.model.reloadMetrics();
    this.view.render();
  }
  if(event instanceof DynamicsEvents.RankChanged && event.getRankedType() === "task" && this.taskListView) {
    this.taskListView.resort();
  }
  if (event instanceof DynamicsEvents.StoryTreeIntegrityViolation) {
    this._showMoveStoryOptions(event.getData(), event.getBacklogId());
  }
  if(event instanceof DynamicsEvents.NamedEvent && event.getEventName() === "storyMoved") {
    this._closeMoveDialog();
  }
};

StoryController.prototype._closeMoveDialog = function() {
  if(this.currentMoveStoryDialog) {
    this.currentMoveStoryDialog.dialog("destroy");
    this.currentMoveStoryDialog.remove();
    this.currentMoveStoryDialog = null;
  }
};

StoryController.prototype._confirmMoveStory = function(model, backlogOrIterationId) {
  var radioButton = this.currentMoveStoryDialog.find("input[type=radio]:checked:eq(0)");
  var parentCheckBox = this.currentMoveStoryDialog.find("input[type=checkbox]:checked:eq(0)");
  var moveParents = false;
  if (parentCheckBox.length) {
    moveParents = true;
  }
  
  if(radioButton.length) {
    if (radioButton.val() === "moveTargetStoryOnly") {
      if (model) {
        model.moveStoryOnly(backlogOrIterationId, moveParents);
      } else {
        this.model.moveStoryOnly(backlogOrIterationId, moveParents);
      }
    }
    else if (radioButton.val() === "moveTargetAndItsChildren") {
      if (model) {
        model.moveStoryAndChildren(backlogOrIterationId, moveParents);
      } else {
        this.model.moveStoryAndChildren(backlogOrIterationId, moveParents);
      }
    }
  } else {
    this.currentMoveStoryDialog.find("#please-select-an-option").show('blind');
    return;
  }
  if(this.currentMoveStoryDialog) {
    this.currentMoveStoryDialog.dialog("destroy");
    this.currentMoveStoryDialog = null;
  }
};

StoryController.prototype._showMoveStoryOptions = function(data, backlogOrIterationId) {
  if (this.currentMoveStoryDialog) {
    this.currentMoveStoryDialog.dialog("option","title","Error in moving story!");
    this.currentMoveStoryDialog.html(data);
  }
};
StoryController.prototype._openMoveStoryDialog = function(model, backlogOrIterationId, changeBacklogOnly) {
  var me = this;
  var element = $('<div/>').appendTo(document.body);
  this.currentMoveStoryDialog = element;
  var titleMessage = 'Moving story - please wait';
  if (changeBacklogOnly) {
    titleMessage = 'Changing backlog - please wait';
  }
  var dialog = element.dialog({
    modal: true,
    title: titleMessage,
    width: 600,
    minHeight:  300,
    closeOnEscape: false,
    buttons: {
      Cancel: function() {
        dialog.dialog('close');
      },
      Confirm: function() {
        if (!model) {
          me._confirmMoveStory(null, backlogOrIterationId);
        } else {
          me._confirmMoveStory(model, backlogOrIterationId);
        }
      }
    },
    close: function() {
      if (!model) {
        me.model.rollback();
      } else {
        model.rollback();
      }
      me._closeMoveDialog();
    }
  });
  element.html('<div style="text-align:center;"><img src="static/img/pleasewait.gif" /></div>');
};

StoryController.prototype._moveStory = function(id) {
  this._openMoveStoryDialog(null, id, false);
  if(this.model.canMoveStory(id)) {
    this.model.moveStory(id);
  }
};

StoryController.prototype._changeStoryBacklog = function(id) {
  this._openMoveStoryDialog(null, id, true);
  if(this.model.canMoveStory(id)) {
    this.model.moveStory(id);
  }
};

StoryController.prototype.copyStorySibling = function(storyObj) {
  this.parentController.copyStorySibling(storyObj);
};

StoryController.prototype.extractUnfinishedStorySibling = function(storyObj) {
  this.parentController.extractUnfinishedStorySibling(storyObj);
  //this.model.reload();
};

/**
 * Remove story associated with controllers row and the row itself.
 */
StoryController.prototype.removeStory = function() {
  var me = this;
  var dialog = new LazyLoadedFormDialog();
  dialog.init({
    title: "Delete story",
    url: "ajax/deleteStoryForm.action",
    data: {
      storyId: me.model.getId()
    },
    loadCallback: function(dialog) {
      dialog.find("input[name=taskHandlingChoice]").click(function() {
        var element = $(this);
        var formDiv = element.parents(".deleteForm");
        var taskHours = formDiv.find('.taskHourEntryHandling:eq(0)');
        if (element.val() == 'DELETE') {
          taskHours.show();
          taskHours.find('input:eq(0)').attr('checked', 'checked');
        } else if (element.val() == 'MOVE') {
          taskHours.hide();
          taskHours.find('input').removeAttr('checked');
        }
      });
    },
    okCallback: function(extraData) {
      if (me.parentController) {
        me.model.remove(function() {
          me.parentController.removeChildController("story", me);
        }, extraData);
      }
      else {
        me.model.remove(null, extraData);
      }
    }
  });
};


StoryController.prototype.editDescription = function() {
  var descriptionCell = this.getCurrentView().getCellByName("description");
  var data = this.getCurrentView().getCellByName("tasksData");
  var taskDataVisible = data.isVisible();
  data.hide();
  descriptionCell.show();
  descriptionCell.openEditor(false, function() {
    descriptionCell.hide();
    if(taskDataVisible) {
      data.show();
    }
  });
};

/**
 * 
 */
StoryController.prototype.changeBacklog = function() {
  var me = this;
  $(window).autocompleteSingleDialog({
    dataType: "backlogs",
    cancel: function() { return; },
    callback: function(id) { me._changeStoryBacklog(id); },
    title: "Select new backlog for story"
  });
};

StoryController.prototype.moveStory = function() {
  var me = this;
  $(window).autocompleteSingleDialog({
    dataType: "backlogsAndIterations",
    cancel: function() { return; },
    callback: function(id) { me._moveStory(id); },
    title: "Select backlog to move to"
  });
  var backlogTextField = jQuery('.autocomplete-searchBoxContainer:eq(0) input');
  backlogTextField.focus();
};

StoryController.prototype.rankStory = function(view, model, previousModel) {
  var targetStory = null;
  var targetModel = view.getParentView().getModel();
  if (previousModel) {
    targetStory = previousModel;
    model.rankUnder(targetStory.getId(), targetModel);
  }
  else {
    targetStory = view.getParentView().getDataRowAt(1).getModel();
    model.rankOver(targetStory.getId(), targetModel);
  }
};

StoryController.prototype.moveStoryToBacklog = function(targetModel) {
  this.model.moveStory(targetModel.getId());
};


StoryController.prototype.labelsViewFactory = function(view, model) {
  var options = {};  
  return new LabelsView(options, this, model, view); 
};

StoryController.prototype.labelsIconFactory = function(view, model) {
  return new LabelsIcon({}, this, model, view);
};

/**
 * 
 */
StoryController.prototype.storyDetailsFactory = function(view, model) {
  return new StoryInfoWidget(model, this, view);
};

StoryController.prototype.storyTaskListFactory = function(view, model) {
  $('<div class="ruler">&nbsp;</div>').appendTo(view.getElement());
  var elem = $('<div/>').appendTo(view.getElement());
  this.taskListView = new DynamicTable(this, this.model, StoryController.taskListConfig, elem);
  return this.taskListView;
};

/**
 * 
 */
StoryController.prototype.showTaskColumn = function() {
  var cell = this.getCurrentView().getCellByName("tasksData");
  var cell2 = this.getCurrentView().getCell("details");
  if (cell) {
    cell.show();
  }
  if (cell2) {
    cell2.show();
  }
};

/**
 * 
 */
StoryController.prototype.hideTaskColumn = function() {
  var cell = this.getCurrentView().getCellByName("tasksData");
  var cell2 = this.getCurrentView().getCell("details");
  if (cell) {
    cell.hide();
  }
  if (cell2) {
    cell2.hide();
  }
};

/**
 * 
 */
StoryController.prototype.showDescriptionColumn = function() {
  this.getCurrentView().getElement().addClass("bottom-margin");
};

/**
 * 
 */
StoryController.prototype.hideDescriptionColumn = function() {
  this.getCurrentView().getElement().removeClass("bottom-margin");
};

/**
 * 
 */
StoryController.prototype.showTasks = function() {
  this.toggleView.expand();
};

/**
 * 
 */
StoryController.prototype.hideTasks = function() {
  this.toggleView.collapse();
};

/**
 * 
 */
StoryController.prototype.taskControllerFactory = function(view, model) {
  var taskController = new TaskController(model, view, this);
  this.addChildController("task", taskController);
  return taskController;
};

StoryController.prototype.createTask = function() {
  var mockModel = ModelFactory.createObject(ModelFactory.types.task);
  mockModel.setStory(this.model);
  // Check whether to add the current user as a responsible.
  var currentUser = PageController.getInstance().getCurrentUser(); 
  if (currentUser.isAutoassignToTasks()) {
    mockModel.addResponsible(currentUser.getId());
  }
  var controller = new TaskController(mockModel, null, this);
  var row = this.taskListView.createRow(controller, mockModel, "top");
  controller.view = row;
  row.autoCreateCells([TaskController.columnIndices.prio, TaskController.columnIndices.actions]);
  row.render();
  controller.openRowEdit();
};

/**
 * 
 */
StoryController.prototype.taskToggleFactory = function(view, model) {
  var me = this;
  var options = {
    collapse : function() { me.getCurrentView().getElement().removeClass("bottom-margin"); },
    expand : function() { me.getCurrentView().getElement().addClass("bottom-margin"); },
    expanded: false,
    targetCells: ["tasksData", "details"]
  };
  this.toggleView = new DynamicTableToggleView(options, this, view);
  return this.toggleView;
};

StoryController.prototype.descriptionToggleFactory = function(view, model) {
  var options = {
    collapse: StoryController.prototype.hideDescriptionColumn,
    expand: StoryController.prototype.showDescriptionColumn,
    expanded: false,
    targetCells: [ "details" ]
  };
  this.toggleView = new DynamicTableToggleView(options, this, view);
  return this.toggleView;
};

StoryController.prototype.rankStoryToTop = function(story, view) {
  story.rankToTop(this.parentController.model);
};

StoryController.prototype.rankStoryToBottom = function(story, view) {
  story.rankToBottom(this.parentController.model);
};

/**
 * 
 */
StoryController.prototype._getStoryActionItems = function(isProject) {
  var actionItems = [];
  
  /*
  actionItems.push({ 
    text : "Change Backlog",
    callback : StoryController.prototype.changeBacklog
  });
  */
  actionItems.push({
    text : "Move",
    callback : StoryController.prototype.moveStory
  });
  if (this.parentController instanceof StoryListController)
  {
	  actionItems.push({
	    text: "Copy",
	    callback : StoryController.prototype.copyStorySibling
	  });
	  actionItems.push({
	    text: "Extract unfinished",
	    tooltip: "Creates a new story and moved the unfinished tasks (status other than Ready or Done) to it",
	    callback : StoryController.prototype.extractUnfinishedStorySibling
	  });
  }
  if (Configuration.isTimesheetsEnabled()) {
    actionItems.push({
      text: "Spent effort",
      callback: StoryController.prototype.openLogEffort
    });
  }
  actionItems.push({
    text : "Delete",
    callback : StoryController.prototype.removeStory
  });
  return actionItems;
};

StoryController.prototype.projectStoryActionFactory = function(view, model) {
  var actionItems = this._getStoryActionItems(true);
  var actionView = new DynamicTableRowActions(actionItems, this, this.model,
      view);
  return actionView;
};

StoryController.prototype.storyActionFactory = function(view, model) {
  var actionItems = this._getStoryActionItems(false);
  var actionView = new DynamicTableRowActions(actionItems, this, this.model, view);
  return actionView;
};

StoryController.prototype.rankToTopAction = function(view, model) {
  var actionItem = {
		  label : "To top",
		  callback : StoryController.prototype.rankStoryToTop
  };
  var actionView = new DynamicTableRowButton(actionItem, this, this.model, view, 50);
  return actionView;
};
	
StoryController.prototype.rankToBottomAction = function(view, model) {
  var actionItem = {
		  label : "To bottom",
		  callback : StoryController.prototype.rankStoryToBottom
  };
  var actionView = new DynamicTableRowButton(actionItem, this, this.model, view, 70);
  return actionView;
};
		
StoryController.prototype.acceptsDraggable = function(model) {
  if (model instanceof TaskModel) {
    return true;
  }
  return false;
};

StoryController.prototype.openLogEffort = function() {
  var widget = new SpentEffortWidget(this.model);
};

StoryController.prototype.openQuickLogEffort = function(model, view) {
  this.openLogEffort();
  //view.openEditor(false, null, true);
};

/**
 * NOTE: this method will be called in the context of StoryModel!
 * Thus this-variable contains a reference to the model object,
 * NOT TO THIS CONTROLLER.
 */
StoryController.prototype.quickLogEffort = function(spentEffort) {
  if (spentEffort !== "") {
    HourEntryModel.logEffortForCurrentUser(this, spentEffort);
  }
};

/**
 * Checks if the given #(hash in the URL) task is in the current story
 * If it is there is sets the window to display it.
 */
StoryController.prototype.searchForTask = function() {
	if(window.location.hash) {
	    var hash = window.location.hash;
	    var type = "task";
	    var id = hash.substring(hash.lastIndexOf("_")+1);
	    var row;
    	if (this.childControllers[type]) {
    		for ( var i = 0; i < this.childControllers[type].length; i++) {
      			if(this.childControllers[type][i].model.id == id) {
      				row = this.childControllers[type][i].view;
				    var pos = row.getElement().offset();
				    jQuery("#bodyWrapper").scrollTop(pos.top - jQuery("#bodyWrapper").offset().top);
      				break;
      			}
    		}
  		}
	}
};

/**
 * 
 */
(function() {
  var config = new DynamicTableConfiguration( {
    //cssClass: "dynamicTable-sortable-tasklist",
    rowControllerFactory : StoryController.prototype.taskControllerFactory,
    dataSource : StoryModel.prototype.getTasks,
    dataType: "task",
    caption: "Tasks",
    captionConfig: {
      cssClasses: "dynamictable-caption-block ui-widget-header ui-corner-all"
    },
    sortCallback: TaskController.prototype.sortAndMoveTask,
    cssClass: "corner-border task-table dynamicTable-sortable-tasklist",
    sortOptions: {
      items: "> .dynamicTableDataRow",
      handle: "." + DynamicTable.cssClasses.dragHandle,
      connectWith: ".dynamicTable-sortable-tasklist > .ui-sortable"
    },
    beforeCommitFunction: TaskController.prototype.checkTaskAndCommit
  });
  config.addCaptionItem( {
    name : "createTask",
    text : "Create task",
    cssClass : "createTask",
    visible: true,
    callback : StoryController.prototype.createTask
  });
  config.addColumnConfiguration(TaskController.columnIndices.prio, {
    minWidth : 24,
    autoScale : true,
    cssClass : 'task-row',
    title : "#",
    headerTooltip : 'Priority',
    sortCallback: DynamicsComparators.valueComparatorFactory(TaskModel.prototype.getRank),
    defaultSortColumn: true,
    subViewFactory: TaskController.prototype.toggleFactory
  });
  config.addColumnConfiguration(TaskController.columnIndices.name, {
    minWidth : 180,
    autoScale : true,
    cssClass : 'task-row',
    title : "Name",
    headerTooltip : 'Task name',
    get : TaskModel.prototype.getName,
    editable : true,
    visualizedEditable: true,
    dragHandle: true,
    edit : {
      editor : "Text",
      set : TaskModel.prototype.setName,
      required: true
    }
  });
  config.addColumnConfiguration(TaskController.columnIndices.state, {
    minWidth : 80,
    autoScale : true,
    cssClass : 'task-row',
    title : "State",
    headerTooltip : 'Task state',
    get : TaskModel.prototype.getState,
    decorator: DynamicsDecorators.taskStateColorDecorator,
    editable : true,
    edit : {
      editor : "Selection",
      set : TaskModel.prototype.setState,
      items : DynamicsDecorators.stateOptions
    }
  });
  config.addColumnConfiguration(TaskController.columnIndices.responsibles, {
    minWidth : 60,
    autoScale : true,
    cssClass : 'task-row',
    title : "Responsibles",
    headerTooltip : 'Task responsibles',
    get : TaskModel.prototype.getResponsibles,
    getView : TaskModel.prototype.getAnnotatedResponsibles,
    decorator: DynamicsDecorators.annotatedUserInitialsListDecorator,
    editable : true,
    visualizedEditable: true,
    openOnRowEdit: false,
    edit : {
      editor : "Autocomplete",
      dialogTitle: "Select users",
      dataType: "usersAndTeams",
      set : TaskModel.prototype.setResponsibles
    }
  });
  config.addColumnConfiguration(TaskController.columnIndices.el, {
    minWidth : 30,
    autoScale : true,
    cssClass : 'task-row',
    title : "Left",
    headerTooltip : 'Effort left in man-hours',
    get : TaskModel.prototype.getEffortLeft,
    decorator: DynamicsDecorators.exactEstimateDecorator,
    editable : true,
    visualizedEditable: true,
    editableCallback: TaskController.prototype.effortLeftEditable,
    edit : {
      editor : "ExactEstimate",
      decorator: DynamicsDecorators.exactEstimateEditDecorator,
      set : TaskModel.prototype.setEffortLeft
    }
  });
  if (Configuration.isTimesheetsEnabled()) {
    config.addColumnConfiguration(TaskController.columnIndices.es, {
      minWidth : 30,
      autoScale : true,
      cssClass : 'task-row',
      title : "Spent",
      headerTooltip : 'Effort spent in man-hours',
      get : TaskModel.prototype.getEffortSpent,
      decorator: DynamicsDecorators.exactEstimateDecorator,
      editable : false,
      visualizedEditable: true,
      onClick: TaskController.prototype.openQuickLogEffort,
      edit : {
        editor : "ExactEstimate",
        decorator: DynamicsDecorators.empty,
        set : TaskController.prototype.quickLogEffort
      }
    });
  }
  config.addColumnConfiguration(TaskController.columnIndices.actions, {
    minWidth : 35,
    autoScale : true,
    cssClass : 'task-row',
    title : "Edit",
    subViewFactory: TaskController.prototype.actionColumnFactory
  });
  config.addColumnConfiguration(TaskController.columnIndices.description, {
    columnName: "description",
    fullWidth : true,
    get : TaskModel.prototype.getDescription,
    decorator: DynamicsDecorators.emptyTaskDescriptionDecorator,
    cssClass : 'task-data text-editor',
    visible : false,
    editable : true,
    visualizedEditable: true,
    edit : {
      editor : "Wysiwyg",
      set : TaskModel.prototype.setDescription
    }
  });
  config.addColumnConfiguration(TaskController.columnIndices.buttons, {
    columnName: "buttons",
    fullWidth : true,
    visible : false,
    cssClass : 'task-row',
    subViewFactory : DynamicsButtons.commonButtonFactory
  });
  StoryController.taskListConfig = config;
})();

StoryController.prototype.contextEditable = function() {
  if (this.getCurrentView().isInRowEdit()) {
    return true;
  }
  return false;
};