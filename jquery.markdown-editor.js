/*

 jQuery Markdown editor
   https://github.com/digitalnature/MarkdownEditor

*/

;(function($, window, document, undefined){
  $.fn.MarkdownEditor = function(){

    var adjustOffset = function(input, offset){
          var val = input.value, newOffset = offset;

          // adjust starting offset, because some browsers (like Opera) treat new lines as two characters (\r\n) instead of one character (\n)      
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
   
          // ie
          }else if(input.createTextRange){
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd('character', selectionEnd);
            range.moveStart('character', selectionStart);
            range.select();
          }
        },

        // indents the textarea selection
        indent = function(textArea, prefix, count){

          // extend the selection start until the previous line feed
          var selection, newValue, range = {start: textArea.value.lastIndexOf('\n', textArea.selectionStart), end: textArea.selectionEnd};

          // if there isn't a line feed before,
          // then extend the selection until the begging of the text
          if(range.start == -1)
            range.start = 0;

          // if the selection ends with a line feed,
          // remove it from the selection
          if(textArea.value.charAt(range.end - 1) == '\n')
            range.end -= 1;

          // extend the selection end until the next line feed
          range.end = textArea.value.indexOf('\n', range.end);

          // if there isn't a line feed after,
          // then extend the selection end until the end of the text
          if(range.end == -1)
            range.end = textArea.value.length;

          // move the selection to a new variable
          selection = '\n' + textArea.value.substring(range.start, range.end) + '\n\n';

          newValue  = textArea.value.substring(0, range.start);
          newValue += selection.replace(/^(?=.+)/mg, Array(count + 1).join(prefix));  // add 'count' spaces before line feeds
          newValue += textArea.value.substring(range.end);

          textArea.value = newValue;
        },

        tags = {
          bold:   {start: '**', end: '**',   placeholder: 'Your bold text'},
          italic: {start: '*',  end: '*',    placeholder: 'Your emphasized text'},
          link:   {start: '[',  end: '][N]', placeholder: 'Add your link title'},
          image:  {start: '![', end: '][N]', placeholder: 'Add image description'},
          quote:  {start: '',   end: '',     placeholder: '\n' + '> Place quoted text here' + '\n'},
          pre:    {start: '',   end: '',     placeholder: '\n' + '    Add your code block here' + '\n'},
          code:   {start: '`',  end: '`',    placeholder: 'Add inline code here'},
        };  

    return this.each(function(){
      var txt      = this,                          // textarea element
          controls = $('<div class="controls" />'), // button container
          resIdx   = 0;                             // track resource count; use to generate index (for links and images)

      $(txt).before(controls.append(
          '<a class="c-bold" accesskey="b"><strong>B</strong></a>'
        + '<a class="c-italic" accesskey="i"><em>I</em></a>'
        + '<a class="c-link" accesskey="a">LINK</a>'
        + '<a class="c-image" accesskey="m">I<kbd>m</kbd>age</a>'
        + '<a class="c-quote" accesskey="q"><kbd>Q</kbd>uote</a>'
        + '<a class="c-code" accesskey="c"><kbd>C</kbd>ode</a>'
      ));

      $(txt).on('keypress', function(event){
        if(event.altKey)
          $('a[accesskey="' + String.fromCharCode(event.keyCode).toLowerCase() + '"]', controls).click();
      });

      $('a', controls).on('click', function(event){
        event.preventDefault();      
        txt.focus();

        var tagName       = this.className.substr(2),
            range         = {start: txt.selectionStart, end: txt.selectionEnd},
            selectedText  = txt.value.substring(range.start, range.end),
            haveOuterText = $.trim(txt.value.charAt(range.start - 1) + txt.value.charAt(range.end));

        // if this is a code tag, decide if it needs to go inline or inside a block
        tagName = (tagName === 'code') && ((selectedText.indexOf('\n') !== -1) || (!haveOuterText) || (txt.value.length < 1)) ? 'pre' : tagName;

        var tag           = $.extend({}, tags[tagName]),
            trimmedPh     = $.trim(tag.placeholder),
            spacesRemoved = tag.placeholder.indexOf(trimmedPh);

        // quote placeholder is not trimmed
        if(tagName === 'quote'){
          trimmedPh = trimmedPh.substr(2);
          spacesRemoved += 2;
        }

        // do nothing if the selection text matches the placeholder text
        if(selectedText === trimmedPh)
          return true;

        // handle link/image requests
        if($.inArray(tagName, ['link', 'image']) !== -1){
          var url = prompt((tagName !== 'image') ? 'Enter the URL' : 'Enter image URL' , 'http://');

          if(url){
            tag.end = tag.end.replace('N', ++resIdx);
            txt.value += '\n\n' + '  [' + resIdx + ']: ' + url;

          }else{
            return true;
          }
        }

        // no actual text selection or text selection matches default placeholder text
        if(range.start === range.end){
          txt.value = txt.value.substring(0, range.end) + tag.start + tag.placeholder + tag.end + txt.value.substring(range.end);
          setCaretToPos(txt, range.end + tag.start.length + spacesRemoved, range.end + tag.start.length + spacesRemoved + trimmedPh.length);

        // we have selected text
        }else{

          // code blocks require indenting only
          if(tagName === 'pre')
            indent(txt, ' ', 4);

          // same with the quotes
          else if(tagName === 'quote')
            indent(txt, '> ', 1);

          // the others need to wrapped between tags
          else
            txt.value = txt.value.replace(selectedText, tag.start + selectedText + tag.end);

        }

        return true;
      });

    });

  };

})(jQuery, window, document);
