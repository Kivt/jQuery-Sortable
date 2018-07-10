$( function() {
  var self = this;
  self.folders = [];

  self.init = function() {
    $.getScript( "assets/js/settings.js" )
      .done(function( script, textStatus ) {
        self.getFolders();
      })
      .fail(function( jqxhr, settings, exception ) {
        self.showError('cannot load settings file');
    });

    $('#modal #closeModal').on('click', function(e) {
      $('.renameForm').css('display', 'none');
      $('#modal').css('display', 'none');
    });

    $('#errorModal #closeModal').on('click', function(e) {
      $('#errorModal').css('display', 'none');
    });

    $('#renameItemButton').on('click', function(e) {
      $('.renameForm').css('display', 'block');
    });

    $('#saveNewName').on('click', function(e) {
      self.changeName($(this).data('item'), $('#renameInput').val());
    });

    $('#deleteItemButton').on('click', function(e) {
      if (parseInt($(this).attr('data-children')) > 0) {
        self.showError(errors.folderNotEmpty);
        return false;
      }

      self.deleteItem($(this).data('item'));
    });

    window.onclick = function(event) {
      if (event.target == document.getElementById('modal')) {
        $('.renameForm').css('display', 'none');
        modal.style.display = "none";
      }

      if (event.target == document.getElementById('errorModal')) {
        $('#errorModal').css('display', 'none');
      }
    };
  };

  self.getFolders = function() {
    self.folders = JSON.parse(window.localStorage.getItem('folders'));
    if (self.folders) {
      self.createLists(self.folders, 'category', 1);
    } else {
      self.getDataFromApi();
    }
  };

  self.setStyles = function() {
    $('li.category i').css('color', folderColor);
    $('li.product i').css('color', fileColor);
    $('#list-holder').css('font-size', fontSize);
    $('#list-holder').css('font-family', fontFamily);
  };

  self.getDataFromApi = function() {
    $.ajax({
      dataType: "json",
      url: 'Categories.json',
      success: function(data) {
        data = self.sort(data);
        self.folders = data;
        window.localStorage.setItem('folders', JSON.stringify(data));
        self.createLists(data, 'category', 1);
      },
      error: function(err) {
        self.showError(errors.loadError);
      }
    });
  };

  self.showError = function(message) {
    $('#errorMessage').text(message);
    $('#errorModal').css('display', 'block');
  };

  self.createLists = function (data, listType, nestedDepth) {
    var dataToAppend;
    var categoriesList = '';
    self.sort(data);

    $.each(data, function(index, value) {
      var isSamePositions = value.initial && value.initial != value.position;
      var type = value.type ? value.type : 'category';
      var childrenType = (value.children ? (value.children.length === 0 ? 'empty' : (value.children[0].type ? value.children[0].type : 'category')) : '');
      categoriesList += '<li data-id="' + value.id + '" data-type="' + type + '" data-childrenType="' + childrenType +
                          '" data-position="' + value.position + '" class="' + type + ( isSamePositions ? ' changed' : '' ) + '">' +
                          (type === "category" ? '<span class="droppable"></span>' : '') +
                          '<i class="' + (value.type ? fileIcon : folderIcon) + '"></i>' +
                          '<span class="name">' + value.name + '</span>'+
                          (value.children ? '<span class="nestedLength">(' + value.children.length + ')</span>' : '') +
                          '<button class="position-changed"><i class="fas fa-sort-amount-down"></i></button>'
                        '</li>';
    });

    listType = categoriesList ? listType : 'empty';

    dataToAppend = "<div class='singleCategory' data-nested='" + nestedDepth + "'>" +
                      "<div class='title'>" +
                        "<div><button class='showInput'><i class='fas fa-plus'></i>Create new Category</button></div>" +
                        "<input type='text' class='hidden'>" +
                        "<button class='saveCategory hidden'><i class='fas fa-check'></i></button>" +
                        "<button class='cancelCategory hidden'><i class='fas fa-times'></i></button>" +
                      "</div>" +
                      "<ul data-type='" + (data.length === 0 ? 'empty' : (data[0].type ? 'product' : 'category')) + "' class='connectedSortable'>" +
                          categoriesList +
                      "</ul>"+
                    "</div>";

    $('#list-holder').append(dataToAppend);
    self.updatePositions($('ul.connectedSortable').last());
    self.rebind();
  };

  // ------- moving category or product

  self.selectFolder = function() {
    $('ul.connectedSortable').on('click', 'li', function(e) {
      if (e.ctrlKey || e.metaKey) {
        $(this).toggleClass("selected");
      } else {
        $(this).addClass("selected").siblings().removeClass('selected');

        if ($(this).hasClass('category')) {
          var id = parseInt($(this).attr('data-id'));
          var index = $(this).index();
          var parentDiv = $(this).closest('.singleCategory');
          var nextNested = parseInt(parentDiv.attr('data-nested')) + 1;
          var strPath = self.getPathToList($(this).closest('ul'));
          var childrenArray;

          if (nextNested > maximumNested) {
            self.showError(errors.maxNestedLevelError);
            return false;
          }

          parentDiv.nextAll('.singleCategory').remove();
          $(this).addClass("opened").siblings().removeClass('opened');

          childrenArray = eval(strPath)[index].children;

          if (childrenArray.length > 0) {
            childrenArray = self.sort(childrenArray);
            self.createLists(childrenArray, $(this).attr('data-type'), nextNested );
            $(this).find('.nestedLength').text('(' + childrenArray.length + ')');
          } else {
            $(this).attr('data-childrenType', 'product');
            var item = this;
            $.ajax({
              dataType: "json",
              url: 'Products.json',
              success: function(data) {
                data.forEach(function (element, index) {
                  element.type = 'product';
                });
                data = self.sort(data);
                self.insertProducts(data, strPath + '[' + index + '].children');
                $(item).find('.nestedLength').text('(' + childrenArray.length + ')');
                self.createLists(data, 'product', nextNested);
                window.localStorage.setItem('folders', JSON.stringify(self.folders));
                self.rebind();
              }
            });
          }
        }
      }
    }).sortable({
      placeholder: "ui-state-highlight",
      connectWith: "ul",
      delay: 150,
      revert: true,
      scroll: true,
      dropOnEmpty: true,
      helper: function (e, item) {
        if (!item.hasClass('selected')) {
            item.addClass('selected').siblings().removeClass('selected');
        }

        $('.droppable').css('z-index', '9000');

        var elements = item.parent().children('.selected').clone();
        item.data('multidrag', elements);

        var siblings = item.siblings('.selected');
        siblings.each(function(key, item) {
          $(item).addClass('hidden-element').hide();
        });

        var helper = $('<li/>');
        return helper.append(elements);
      },
      stop: function (e, ui) {
        var error = true;
        var initialParent = $(e.target);
        var parent = $(initialParent).parent('div').prev('div').find('.opened');
        var targetParent = $(ui.item).parent();
        var itemId = $(ui.item).attr('data-id');
        var targetIndex = $(ui.item).index();
        var targetId = parseInt(targetParent.parent().prev().find('li.opened').attr('data-id'));
        var parentIndex = parseInt(targetParent.parent().attr('data-nested'));
        var isDifferentParent = $(targetParent).parent().attr('data-nested') != $(initialParent).parent().attr('data-nested');
        var initialParentPath = self.getPathToList(initialParent);
        var targetParentPath = self.getPathToList(targetParent);
        var dataToSend = {id: itemId, type: $(ui.item).attr('data-type'), name: $(ui.item).find('.name').text(), position: targetIndex + 1, parent: $(parent).attr('data-id') };

        targetId = targetId ? targetId : -1;
        error *= targetParent.attr('data-type') ===  initialParent.attr('data-type') || targetParent.attr('data-type') === 'empty';

        if (targetId < 0 && parentIndex > 1) {
          error = false;
        }

        if (targetParentPath.includes(initialParentPath) && targetParentPath !== initialParentPath) {
          error = false;
        }

        if (!error) {
          $(e.target).sortable('cancel');
          $('.hidden-element').show();
          $('.hidden-element').removeClass('.hidden-element');
          self.showError(errors.illegal);
          $('.droppable').css('z-index', '0');
          return false;
        }

        $.ajax({
          dataType: "json",
          url: 'Success.json',
          data: dataToSend,
          success: function(data) {
            var elements = ui.item.data('multidrag');
            targetParent.attr('data-type', initialParent.attr('data-type'));

            $.each(elements, function(i, e) {
              var id = parseInt($(e).attr('data-id'));
              self.moveItem(id, targetIndex, initialParent, targetParent, targetId);
            });

            ui.item.after(elements).remove();
            $('.hidden-element').remove();
            self.updateDomPosition(initialParent, $(initialParent).children().length);
            self.updateDomPosition(targetParent, $(targetParent).children().length);
            self.updatePositions(initialParent, isDifferentParent);
            self.updatePositions(targetParent, isDifferentParent);
            window.localStorage.setItem('folders', JSON.stringify(self.folders));
            targetParent.parent('div.singleCategory').nextAll('.singleCategory').remove();
            self.rebind();
            $('.droppable').css('z-index', '0');
          },
          error: function(err) {
            self.showError(errors.loadError);
          }
        });
      }
    });
  };

  self.setDoubleClick = function() {
    $('ul.connectedSortable li.category').dblclick(function(e) {
      var strPath = self.getPathToList($(this).parent());
      var children = eval(strPath)[$(this).index()].children;
      $('#renameInput').val($(this).find('.name').text());

      if (children) {
        $('#deleteItemButton').attr('data-children', children.length);
      } else {
        $('#deleteItemButton').removeAttr('data-children');
      }

      $('#saveNewName').data('item', this);
      $('#deleteItemButton').attr('data-position', $(this).attr('data-position'));
      $('#deleteItemButton').data('item', this);
      $('#modal').css('display', 'block');
    });
  };

  self.changeName = function(item, newName) {
    var error = true;
    var parent = $(item).parent();
    var index = parseInt($(item).attr('data-position')) - 1;
    var strPath = self.getPathToList(parent);
    var dataToSend = {id: $(item).attr('data-id'), type: 'category', name: newName};

    $.each(parent.find('.name'), function(i, e) {
      error *= !($(e).text() === newName);
    });

    error *= newName.match(nameRegex) ? false : true;

    if (!error) {
      self.showError(errors.invalidName);
      return false;
    }

    $.ajax({
      dataType: "json",
      url: 'Success.json',
      data: dataToSend,
      success: function(data) {
        eval(strPath)[index].name = newName;
        $(item).find('.name').text(newName);
        window.localStorage.setItem('folders', JSON.stringify(self.folders));
        $('.renameForm').css('display', 'none');
        $('#modal').css('display', 'none');
      }
    });
  };

  self.deleteItem = function(item) {
    var parent = $(item).parent();
    var index = parseInt($('#deleteItemButton').attr('data-position')) - 1;
    var strPath = self.getPathToList(parent);
    var dataToSend = {id: $(item).attr('data-id'), type: $(item).attr('data-type'), delete: true};

    $.ajax({
      dataType: "json",
      url: 'Success.json',
      data: dataToSend,
      success: function(data) {
        eval(strPath).splice(index, 1);
        item.remove();
        self.updateDomPosition(parent, parent.children().length);
        window.localStorage.setItem('folders', JSON.stringify(self.folders));
        $('#modal').css('display', 'none');
      }
    });
  };

  self.rebind = function() {
    $('.addCategory').unbind('click');
    $('ul.connectedSortable li').unbind('dblclick');
    $('ul.connectedSortable').unbind('click');
    $('.saveCategory').unbind('click');
    $('.showInput').unbind('click');
    $('.position-changed').unbind('click');
    $('.cancelCategory').unbind('click');

    $('.droppable').droppable({
       accept: "li.product",
      drop: function(e, ui) {
        var prevUl = $('li.product.selected').parent('ul');
        var childrenType = $(e.target).parent().attr('data-childrentype');
        var targetUl = $(e.target).closest('ul');
        var nested = $(prevUl).attr('data-nested')
        var strPrevPath = self.getPathToList(prevUl);
        var parent = $(targetUl).parent('div');
        var strTargetPath = self.getPathToList(targetUl);
        $(prevUl).sortable('cancel');
        $('.hidden-element').show();
        $('.hidden-element').removeClass('.hidden-element');

        $('.droppable').css('z-index', '0');

        if (childrenType != 'category') {
          var parent = $(targetUl).parent('div');
          self.moveProducts(prevUl, targetUl, parseInt($(e.target).parent().attr('data-position')) - 1);
          $(parent).nextAll('div').remove();
          $(parent).remove();
          self.createLists(eval(strTargetPath), 'category', nested);
        } else {
          self.showError(errors.notProducts);
          $(parent).nextAll('div').remove();
        }
      }
    });

    $('.showInput').on('click', function(e) {
      var parent = $(this).parent();
      parent.toggleClass('hidden').nextAll().toggleClass('hidden');
    });

    $('.cancelCategory').on('click', function(e) {
      var parent = $(this).parent();
      $(this).prevAll('input').val('');
      parent.children().toggleClass('hidden');
    });

    self.onSaveButtonClick();
    self.selectFolder();
    self.setDoubleClick();
    self.setStyles();
    self.positionReset();
  };

  self.positionReset = function() {
    $('.position-changed').on('click', function(e) {
      var temp;
      var parentLi = $(this).parent();
      var children = parentLi.parent().children();
      var ulPath = self.getPathToList(parentLi.parent());
      var curIndex = parseInt(parentLi.attr('data-position')) - 1;
      var initialIndex = eval(ulPath)[curIndex].initial - 1;
      var dataToSend = {id: $(parentLi).attr('data-id'), type: $(parentLi).attr('data-type'), position: eval(ulPath)[curIndex].initial}

      if (children[initialIndex]) {
        if (initialIndex >= curIndex) {
          $(parentLi).insertAfter(children[initialIndex]);
        } else {
          $(parentLi).insertBefore(children[initialIndex]);
        }
      } else {
        $(parentLi).insertAfter(children[children.length - 1]);
      }

      $.ajax({
        dataType: "json",
        url: 'Success.json',
        data: dataToSend,
        success: function(data) {
          $(parentLi).removeAttr('data-prevpos');
          $(parentLi).removeClass('changed');

          self.updateDomPosition(parentLi.parent(), children.length);
          temp = eval(ulPath).splice(curIndex, 1);
          eval(ulPath).splice(initialIndex, 0, temp[0]);
          self.updatePositions(parentLi.parent());
          window.localStorage.setItem('folders', JSON.stringify(self.folders));
        }
       });
    });
  };

  // ------ creating folder

  self.insertFolder = function(fullPath, name, list) {
    var position;
    var parent = $(list).parent();
    var depth = parent.attr('data-nested')
    var type = $(list).children().length > 0 ? $(list).attr('data-type') : 'empty';
    var tempId = parseInt(Math.random() * (1000 - 100)) + 100;
    var obj = { id: tempId, name: name, position: 1, children: [] };
    var dataToSend = {type: 'category', name: name};

    $.ajax({
      dataType: "json",
      url: 'Success.json',
      data: dataToSend,
      success: function(data) {
        if (type === 'product') {
          obj.children = eval(fullPath).splice(0, eval(fullPath).length);
          $(list).empty();
        }

        position = eval(fullPath).length + 1;
        obj.position = position;

        $(list).attr('data-type', 'category');
        eval(fullPath).push(obj);

        parent.nextAll('div.singleCategory').remove();
        parent.remove();
        self.createLists(eval(fullPath), type, depth);
        $('ul.connectedSortable').last().attr('data-type', 'category');
      }
    });
  };

  self.onSaveButtonClick = function() {
    $('.saveCategory').on('click', function(e) {
      var error = true;
      var name = $(this).prev()[0].value;
      var parentList = $(this).parent().next('ul');

      error *= name.match(nameRegex) ? false : true;

      $.each(parentList.find('.name'), function(i, e) {
        error *= !($(e).text() === name);
      });

      if (!error) {
        self.showError(errors.invalidName);
        return false;
      }

      var list = $(this).closest('div.singleCategory').prevAll('div.singleCategory');
      var strPath = self.getPathToList(parentList)

      var parent = $(this).parent();
      parent.toggleClass('hidden').children().toggleClass('hidden');

      self.insertFolder(strPath, name, parentList);
      self.rebind();
    });
  };

  self.moveItem = function(id, destenationIndex, oldList, newList, destenationId) {
    var temp = [];
    var oldStr = self.getPathToList(oldList);
    var newStr = self.getPathToList(newList);

    self.folders.forEach(function() {
      var item = self.cutElement(eval(oldStr), id);
      if (item) {
        temp.push(item[0]);
      }
    });

    if (destenationId < 0) {
      temp.forEach(function(e, i) {
        self.folders.splice(destenationIndex + i, 0, e);
      });
    } else {
      temp.forEach(function(e, i) {
        eval(newStr).splice(destenationIndex, 0, e);
      });
    }
  };

  self.getPathToList = function(list) {
    var pathArray = [];
    var strPath = 'self.folders';
    var divList = $(list).parent().prevAll('div.singleCategory');

    $.each(divList, function(i, e) {
      pathArray.push(parseInt($(e).find('li.opened').attr('data-position')) - 1);
    });

    pathArray.reverse();
    pathArray.forEach(function(e, i) {
      strPath += '[' + e + '].children';
    });

    return strPath;
  };

  self.updatePositions = function(list, isDifferentParent) {
    var strPath = self.getPathToList(list);
    var children = $(list).children();

    eval(strPath).forEach(function(e, i) {
      $.each(children, function(index, el) {
        if (e.id === parseInt($(el).attr('data-id'))) {
          e.position =  parseInt($(el).attr('data-position'));

          if (!e.initial || isDifferentParent) {
            e.initial = parseInt($(el).attr('data-position'));
            $(el).removeClass('changed');
          } else {
            if (e.initial == e.position) {
              $(el).removeClass('changed');
            } else {
              $(el).addClass('changed');
            }
          }
        }
      });
    });
  };

  self.updateDomPosition = function(list, newLength) {
    var parent = $(list).parent().prev().find('li.opened');
    var temp;
    list.find('li').each(function(index, element) {
      $(element).attr('data-position', index + 1);
    });

    if (parent) {
      parent.find('.nestedLength').text('(' + newLength + ')');
    }
  };

  self.sort = function(array) {
    array.sort(function(a, b) {
      return a.position - b.position;
    });

    return array;
  };

  self.insertProducts = function(products, pathToPaste) {
    products.forEach(function(element, index) {
      eval(pathToPaste).push(element);
    })
  };

  self.cutElement = function(array, id) {
    for (var i = 0; i < array.length; i++) {
      if (array[i].id === id) {
        return array.splice(i, 1);
      }
    }
  };

  self.moveProducts = function(oldList, newList, index) {
    var strOldList = self.getPathToList(oldList);
    var strNewList = self.getPathToList(newList);
    var elems = [];

    $.each($(oldList).children(), function(i, e) {
      if ($(e).hasClass('selected')) {
        elems = elems.concat(eval(strOldList).splice(parseInt($(e).attr('data-position')) - (1 + elems.length), 1));
      }
    });

    eval(strNewList)[index].children = eval(strNewList)[index].children.concat(elems);

    eval(strOldList).forEach(function(e, i) {
      e.initial = i + 1;
      e.position = i + 1;
    });

    eval(strNewList)[index].children.forEach(function(e, i) {
      e.initial = i + 1;
      e.position = i + 1;
    });

    window.localStorage.setItem('folders', JSON.stringify(self.folders));
  };

  self.init();
});