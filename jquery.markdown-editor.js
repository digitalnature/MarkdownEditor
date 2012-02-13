/*

 Markdown editor - StackOverflow style
   by digitalnature

     http://digitalnature.eu
     http://github.com/digitalnature/Markdown-Editor

     Demo: http://dev.digitalnature.eu/jquery/markdown-editor/

 License under GPL and MIT.
 Initially this was a jQuery port of JS-QuickTags by Alex King, but I eventually ended up using Markdown, so I had to change pretty much everyting.
 Read more about the Markdown syntax here: http://daringfireball.net/projects/markdown/syntax



 Usage:

    $('.editor').MarkdownEditor();



  Change log:

    13 feb. 2012, v0.2  - first public release
                        - added repo to github (first public release)

    14 jan. 2012, v0.1  - First release (as a WP theme module on digitalnature.eu)


  @todos:
    - add some options
    - add some kind of localization system (use options maybe?)
    - generate controls with javascript?

*/




(function($){
$.fn.MarkdownEditor = function(){

  return this.each(function(){

    var instance = $(this),

        field = $('textarea', this).get(0),

        resourceCount = 0,

        // adjust starting offset, because some browsers (like Opera) treat new lines as two characters (\r\n) instead of one character (\n)
        adjustOffset = function(input, offset){
          var val = input.value, newOffset = offset;

          if(val.indexOf('\r\n') > -1){
            var matches = val.replace(/\r\n/g, '\n').slice(0, offset).match(/\n/g);
            newOffset += matches ? matches.length : 0;
          }

          return newOffset;
        },

        // creates a selection inside the textarea
        // if selectionStart = selectionEnd the cursor is set to that point
        setCaretToPos = function(input, selectionStart, selectionEnd){

          input.focus();

          if(input.setSelectionRange){
            input.setSelectionRange(adjustOffset(input, selectionStart), adjustOffset(input, selectionEnd));

          }else if(input.createTextRange){
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd('character', selectionEnd);
            range.moveStart('character', selectionStart);
            range.select();
          }
        },

        // returns the current selection from the textarea
        getTextAreaSelectionRange = function(textArea){

          /*/ IE doesn't provide the properties we're after -- disabled for now
          if(document.selection){
            textArea.selectionStart = textArea.value.indexOf(textArea.selectedText);
            textArea.selectionEnd = textArea.selectionStart + textArea.selectedText.length;
            if(textArea.selectionStart < 0)
              textArea.selectionStart = textArea.selectionEnd = 0;
          }
          //*/

          return {start: textArea.selectionStart, end: textArea.selectionEnd};
        },

        // indents the textarea selection
        indentSelection = function(textArea, count, prefix){

          var selection, newValue, range = getTextAreaSelectionRange(textArea);

          // extend the selection start until the previous line feed
          range.start = textArea.value.lastIndexOf('\n', range.start);

          // if there isn't a line feed before,
          // then extend the selection until the begging of the text
          if(range.start == -1)
            range.start = 0;

          // if the selection ends with a line feed,
          // remove it from the selection
          if(textArea.value.charAt(range.end - 1) == '\n')
            range.end = range.end - 1;

          // extend the selection end until the next line feed
          range.end = textArea.value.indexOf('\n', range.end);

          // if there isn't a line feed after,
          // then extend the selection end until the end of the text
          if(range.end == -1)
            range.end = textArea.value.length;

          // move the selection to a new variable
          selection = '\n' + textArea.value.substring(range.start, range.end) + '\n\n';

          // add 'count' spaces before line feeds
          selection = selection.replace(/^(?=.+)/mg, Array(count + 1).join(prefix));

          // rebuild the textarea content
          newValue = textArea.value.substring(0, range.start);
          newValue += selection;
          newValue += textArea.value.substring(range.end);
          textArea.value = newValue;
        },

        tags = {
          bold:   {tagStart: '**', tagEnd: '**',   placeholder: 'Your bold text'},
          italic: {tagStart: '*',  tagEnd: '*',    placeholder: 'Your emphasized text'},
          link:   {tagStart: '[',  tagEnd: '][N]', placeholder: 'Add your link title'},
          image:  {tagStart: '![', tagEnd: '][N]', placeholder: 'Add image description'},
          quote:  {tagStart: '',   tagEnd: '',     placeholder: '\n' + '> Place quoted text here' + '\n'},
          pre:    {tagStart: '',   tagEnd: '',     placeholder: '\n' + '    Add your code block here' + '\n'},
          code:   {tagStart: '`',  tagEnd: '`',    placeholder: 'Add inline code here'},
        };


    $('.control', this).click(function(event){
      event.preventDefault();

      // triggers clearField's checks; we don't want clearField's placeholders in our textarea
      // this is required before any calls to the functions above
      field.focus();

      var tag = /c-([^\s]+)/.exec($(this).attr('class'))[1],
          range = getTextAreaSelectionRange(field),
          selectedText = field.value.substring(range.start, range.end),
          haveOuterText = $.trim(field.value.charAt(range.start - 1) + field.value.charAt(range.end));

      // if this is a code tag, decide if it needs to go inline or inside a block
      tag = (tag === 'code') && ((selectedText.indexOf('\n') !== -1) || (!haveOuterText) || (field.value.length < 1)) ? 'pre' : tag;

      var trimmedPlaceholder = $.trim(tags[tag].placeholder),
          spacesRemoved = tags[tag].placeholder.indexOf(trimmedPlaceholder);

      // quote placeholder is not trimmed
      if(tag === 'quote'){
        trimmedPlaceholder = trimmedPlaceholder.substring(2, trimmedPlaceholder.length);
        spacesRemoved = spacesRemoved + 2;
      }

      // do nothing if the selection text matches the placeholder text
      if(selectedText == trimmedPlaceholder)
        return true;

      // handle link/image requests
      if($.inArray(tag, ['link', 'image']) !== -1){
        var url = prompt((tag !== 'image') ? 'Enter the URL' : 'Enter image URL' , 'http://');

        if(url){
          resourceCount++;
          tags[tag].tagEnd = tags[tag].tagEnd = '][' + resourceCount + ']';

          field.value += '\n\n' + '  [' + resourceCount + ']: ' + url;

        }else{
          return true;
        }
      }

      // no actual text selection or text selection matches default placeholder text
      if(range.start === range.end){

        var newStartPos = range.end + tags[tag].tagStart.length + spacesRemoved,
            newEndPos = range.end + tags[tag].tagStart.length + spacesRemoved + trimmedPlaceholder.length;

        field.value = field.value.substring(0, range.end) + tags[tag].tagStart + tags[tag].placeholder + tags[tag].tagEnd + field.value.substring(range.end, field.value.length);
        setCaretToPos(field, newStartPos, newEndPos);

      // we have selected text
      }else{

        // code blocks require indenting only
        if(tag === 'pre'){
          indentSelection(field, 4, ' ');

        // same with the quotes
        }else if(tag === 'quote'){
          indentSelection(field, 1, '> ');

        // the others need to wrapped between tags
        }else{
          var selection = tags[tag].tagStart + selectedText + tags[tag].tagEnd;
          field.value = field.value.replace(selectedText, selection);
        }

      }

      field.focus();
      return true;
	});

  });



};

})(jQuery);

