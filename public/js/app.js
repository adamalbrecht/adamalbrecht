$('.contact-link').each(function(i, link) {
  $(link).prop('href', 'mail' + 'to' + ':adam' + '.' + 'albrecht' + '@' + 'gmail' + '.com');
});
$('.mobile-toggle').on('click', function(e) {
  e.preventDefault();
  $('.toggle-content').toggleClass('open');
});
