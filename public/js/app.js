var contactLinks = document.getElementsByClassName('contact-link');  
if (contactLinks && contactLinks.length > 0) {
  for (var i=0; i<contactLinks.length; i++) {
    contactLinks[i].setAttribute('href', 'mail' + 'to' + ':adam' + '.' + 'albrecht' + '@' + 'gmail' + '.com');
  }
}
