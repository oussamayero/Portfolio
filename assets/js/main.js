(function(){
  var h=document.getElementById('hdr');
  function onScroll(){h.classList.toggle('solid',window.scrollY>40)}
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});
  var els=document.querySelectorAll('.card,.proj,.step,.plan,.q,.photo,.player,.head');
  els.forEach(function(e){e.classList.add('reveal')});
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12});
  els.forEach(function(e){io.observe(e)});
  var v=document.querySelector('.hero video');
  if(v){v.addEventListener('error',function(){v.remove()},true);var ss=v.querySelectorAll('source');if(ss.length)ss[ss.length-1].addEventListener('error',function(){v.remove()})}
  var iv=document.querySelectorAll('video[data-inview]');
  if('IntersectionObserver' in window)iv.forEach(function(v){new IntersectionObserver(function(es){es.forEach(function(x){x.isIntersecting?v.play().catch(function(){}):v.pause()})},{threshold:.4}).observe(v)});
})();
