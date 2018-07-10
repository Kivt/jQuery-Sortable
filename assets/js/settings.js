const maximumNested = 4; // maximal nested length
const folderIcon = 'fas fa-folder'; // only font-awesome icons, or you need to include other icons in index.html
const folderColor = '#D39D46'; // Folder icon color
const fileIcon = 'far fa-file'; // only font-awesome icons, or you need to include other icons in index.html
const fileColor = '#D39D46'; // File icon color
const fontSize = '14px';
const fontFamily = 'Arial, Helvetica, sans-serif';
const nameRegex = /^\<|>|\/|\?|\*|:|"{1,30}$/g; // input validator egex
const errors = {
  illegal: 'Illegal move',
  maxNestedLevelError: 'Maximum nested level is ' + maximumNested,
  invalidName: 'Invalid Name',
  loadError: 'Cannot Load Data',
  folderNotEmpty: 'This folder can\'t be removed, it contains another folders and/or files',
  notProducts: 'You can not move product inside this category'
};