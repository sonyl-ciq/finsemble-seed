(function(w){
    "use strict";

    function Resize(table, config) {
    var DEFAULT_MINIMUM_WIDTH = 90;
    var startPoint = null;
    var currentColumn = null;
    var divideHandler = null;
    var dragTarget = null;
    var columnsSize = null;
	var startColumnWidth = null;
    if(!config) {
        config = {};
    }

    var userConfig = {
        minimumWidth: config.minimumWidth || DEFAULT_MINIMUM_WIDTH,
        columns: config.columns || []
    };

    function initialize() {
        var resizableColumns = table.getElementsByClassName('slds-resizable');
        var allColumns = getHeadTh(table);
        setColumnDefaultSize(allColumns);
        addEventListenerList(resizableColumns, 'mousedown', startDrag);
    }

    function isResizableColumn(column) {
        return column.getElementsByClassName('slds-resizable').length > 0;
    }

    function getColumnHeight() {
        if(getHeadTh(table)[0]) {
            return getHeadTh(table)[0].clientHeight;
        }
        return 35;
    }

    function addDividerHandler() {
        var parent = table.parentNode;

        var dividerHandlerHeight = table.getElementsByClassName('slds-resizable')[0].clientHeight;
        //Divider handler holder
        var indicator = document.createElement('div');
        indicator.className = 'indicator';
        indicator.style.position = 'relative';

        var resizeHandler = document.createElement('span');
        resizeHandler.className = 'slds-resizable__handle';
        resizeHandler.style.opacity = 1;
        resizeHandler.style.left = 0;
        resizeHandler.style.height = getColumnHeight() + 'px';

        var resizeDivider = document.createElement('span');
        resizeDivider.className = 'slds-resizable__divider';
        resizeDivider.style.zIndex = '1';

        resizeHandler.appendChild(resizeDivider);
        indicator.appendChild(resizeHandler);
        parent.insertBefore(indicator, table);

        return indicator;
    }

    function destoryDividerHandler() {
        if(divideHandler) {
            divideHandler.parentNode.removeChild(divideHandler);
            divideHandler = null;
        }
    }

    function drag(event) {
        handleTextSelection();
        showDivider(event);
    }

    function showDivider(event) {
        if(currentColumn) {
            if((currentColumn.clientWidth + event.clientX - startPoint) >= userConfig.minimumWidth) {
                var translate = 'translate(' + (dragTarget.getBoundingClientRect().left + event.clientX - startPoint - table.getBoundingClientRect().left) + 'px, 0)';
                divideHandler.childNodes[0].style.transform = translate;
            }
        }
    }

    function handleTextSelection() {
        if(currentColumn) {
            window.getSelection().removeAllRanges();
        }
    }

    function calculateTableWidth(table) {
        var allColumns = getHeadTh(table);
        var tableWidth = 0;
        for(var i = 0; i < allColumns.length; i++) {
            tableWidth += allColumns.clientWidth;
        }
        return tableWidth;
    }

    function getHeadTh(table) {
        return table.getElementsByTagName('thead')[0].getElementsByTagName('th');
    }

    function setColumnDefaultSize(allColumns) {
        columnsSize = [];
        setInitialWidth(allColumns);
        setSecondaryWidth(allColumns);
    }

    function setSecondaryWidth(allColumns) {
        for(var i = 0; i < allColumns.length; i++) {
            for(var j = 0; j < userConfig.columns.length;j++) {
                if((allColumns[i].textContent == userConfig.columns[j].label) && userConfig.columns[j].width) {
                    var columnWidth = userConfig.columns[j].width;
                    if(isResizableColumn(allColumns[i])) {
                        columnWidth = columnWidth >= DEFAULT_MINIMUM_WIDTH ? columnWidth : DEFAULT_MINIMUM_WIDTH;
                    }
                    allColumns[i].style.width = columnWidth + 'px';
                    break;
                }
            }
        }
    }

    function setInitialWidth(allColumns) {
        for(var i = 0; i < allColumns.length; i++) {
            var columnWidth = allColumns[i].clientWidth;
            allColumns[i].style.width = columnWidth + 'px';
        }
    }

    function startDrag(event) {
        addEvent(window, 'mouseup', stopDrag);
        addEvent(window, 'mousemove', drag);
        startPoint = event.clientX;
        currentColumn = findParentTH(event.target);
        dragTarget = event.target;
        dragTarget.style.opacity = 0;
        divideHandler = addDividerHandler();
        showDivider(event);
        event.stopImmediatePropagation();
        return false;
    }

    function stopDrag(event) {
        if(currentColumn) {
            var stopPoint = event.clientX;
            var columnsWidth = stopPoint - startPoint;
            var tableWidth = table.clientWidth;
            currentColumn.style.width = (currentColumn.clientWidth + columnsWidth > userConfig.minimumWidth ? currentColumn.clientWidth + columnsWidth : userConfig.minimumWidth) + 'px';
            table.style.width = (tableWidth + columnsWidth) + 'px';
            if(dragTarget) {
                dragTarget.style.opacity = '';
                dragTarget = null;
            }
        }
        destoryDividerHandler();
        currentColumn = null;
        startColumnWidth = null;
		removeEvent(window, 'mouseup', stopDrag);
        removeEvent(window, 'mousemove', drag);
        event.stopImmediatePropagation();
    }

    function findParentTH(element) {
        while (element && element.tagName !== "TH") {
            element = element.parentNode;
        }
        return element;
    }

    //Attach an event to a NodeList[]
    function addEventListenerList(list, eventType, fn) {
        for (var i = 0, len = list.length; i < len; i++) {
            list[i].addEventListener(eventType, fn, false);
        }
    }

    function addEvent(element, eventType, listener) {
        element.addEventListener(eventType, listener);
    }

    function removeEvent(element, eventType, listener) {
        element.removeEventListener(eventType, listener);
    }

    return {
        initialize: initialize
    }
}
    w.columnResizer = Resize;

})(window);

