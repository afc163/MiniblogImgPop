// ==UserScript==
// @name			Miniblog Img Pop
// @namespace		http://userscripts.org/users/83994
// @description		微博浮图控件，鼠标移过小图弹出浮动大图的脚本
// @version			2.1
// @include			http://*qing.weibo.com/*
// @include			http://*weibo.com/*
// @include			http://*t.163.com/*
// @include			http://*t.sohu.com/*
// @include			http://*t.qq.com/*
// @include			http://*t.ifeng.com/*
// @include			http://*t.titan24.com/*
// @include			http://*t.people.com.cn/*
// @include			http://*my.tianya.cn/*
// @include			http://*diandian.com/*
// @include			http://*.digu.com/*
// @include			http://*qzone.qq.com/*
//
// ==/UserScript==

// @author		afc163
// @weibo		http://weibo.com/afc163
// @code		https://github.com/afc163/miniblogImgPop
// @blog		http://pianyou.me
// @date		2010.8.12
// @modified	2010.9.14
// @modified	2010.9.17	修改代码使其只多增加一个img标签，无论计算大图大小和显示大图都使用同一个img标签
// @modified	2010.9.20	imgHeight等于10px，表示图片层的上下边框大小之和，其图片尚未载入
// @modified	2010.10.14	1.扩展此功能至新浪微博，腾讯微博，搜狐微博，网易微博，人民微博，体坛微博，百度说吧等微博网站，并改名为miniblogImgPop;
//							2.改进代码使之适应ajax载入新微博时的情况，在网速过慢（10秒内未能载入新微博）的情况下会失效;
//							3.修改动画参数和代码结构以进一步优化代码性能;
//							4.不处理iframe中的微博页面以避免某些性能问题;
//							5.独立出miniblogsConfig，方便对大部分微博网站进行扩展。config格式如下：
//							{'微博域名':{
//								className:'feed_img',			//需要注册弹出事件的标签className
//								otherSrc:'dynamic-src',			//延迟载入时用于保存图片地址的额外标签，有的网站不需要此项
//								sFrag:'thumbnail',				//小图的图片地址中的特征段，用于替换
//								bFrag:'bmiddle',				//大图的图片地址中的特征段，用于替换
//								newFeedBtns:['feed_msg_new']	//导致ajax载入新微博的按钮id列表
//							}}.
// @modified	2010.10.15	增加cache存储上次的图片数据，用于提高效率和修复chrome下t.sohu.com的bug，但未能完全修复。。。
// @modified	2010.11.17	修改top!=this为top!=window，使之和spidemonkey兼容
// @modified	2010.11.17	增加对天涯微博的支持
// @modified	2010.12.06	1.增加对凤凰微博的支持
//							2.修改一个低网速下出现的图片载入错位的bug
// @modified	2010.12.16	1.根据增加了一个z键固定图片功能，按住z键后所有图片浮出和消失功能会失效，
//							  改进后看大图片时，只需要按住z键便可以上下滚动页面
// @modified	2011.1.6	修改了在腾讯微博和搜狐微博下，新feed载入时的init方式，改为每2.5秒绑定一次
// @modified	2011.5.16	修复了网易微博下的一个bug
// @modified	2011.6.22	1.增加了对新版新浪微群的支持
//							2.将图片宽度固定为450px
// @modified	2011.8.18	1.改进了轮询新feed的机制
// @modified	2011.9.9	1.新增了对新版新浪微博的支持，同时支持新旧双版
///							2.移除了对百度说吧的支持
// @modified	2011.9.30	大量重构和改动，效率更高，支持更多网站
//							1.增加对QQ空间、嘀咕网、点点网、新浪轻博的支持！
//							2.使用事件委托方法重构图片绑定事件，去除低效的轮询方法，根除不时丢失绑定的bug
//							3.缓存机制提高效率
//							4.去除对t.house.sina.com.cn和t.sina.com.cn的支持
//							5.修正因部分微博网站改动而无法正确运行的bug
// @modified	2011.10.11	修复一个新浪微博偶尔失去绑定的bug
// @modified	2011.11.17	1.修复一个在chrome下图片透明度为0时仍然遮盖网页的bug
//							2.修复在淘宝商城、京东商城等新浪企业微博下无效的问题
//							3.修正新浪微博切换到提到我的微博等页面后绑定失效的问题
// @modified	2012.03.02	1.修正chrome下图片定位不准的bug
//							2.提高图片的zIndex使其覆盖头部导航
//							3.超屏大图定位不居中，而是定位到可视范围顶部
//							4.优化部分代码，提高效率
// @modified	2012.03.03	1.使用new Image来获得图片高度，彻底修正chrome下图片定位不准的bug
//							2.使用GM_addStyle，优化图片边框样式

(function() {
	//dont handle iframe situation
	//if(top != window) return;		//有些企业版是嵌在iframe里的啊！不能不处理啊！只能干掉了。。。
	var imgPop = (function() {
		//var date = null; //用于计算运行时间，调试使用
		var that = this,
			cache = {};
		cache.timer = null,
		cache.timerHeight = null,
		cache.siteName = '',
		cache.imgObj = null,
		cache.loc = window.location.href,
		cache.imgInfo = {},
		cache.zPressing = false;
		
		var miniblogsConfig = {
			'qing.weibo.com':{
				feedSelector:'.imgZoomIn',
				sFrag		:'',
				bFrag		:''
			},
			'q.weibo.com':{
				feedSelector:'img.bigcursor',
				sFrag		:'thumbnail',
				bFrag		:'large'
			},
			'weibo.com':{
				feedSelector:'div.bigcursor',
				sFrag		:'thumbnail',
				bFrag		:'bmiddle'
			},
			't.sohu.com':{
				feedSelector:'.pic',
				sFrag		:['/f_','_1.jpg'],
				bFrag		:['/m_','_0.jpg']
			},
			't.163.com':{
				feedSelector:'.status-sPhoto',
				sFrag		:'120&h=120',
				bFrag		:'460'
			},
			't.qq.com':{
				feedSelector:'.pic img',
				sFrag		:'/160',
				bFrag		:'/460'
			},
			't.titan24.com':{
				feedSelector:'.imgBig',
				sFrag		:'_thumbnail',
				bFrag		:'_middle'
			},
			't.people.com.cn':{
				feedSelector:'.miniImg',
				sFrag:'/s_',
				bFrag:'/b_'
			},
			't.ifeng.com':{
				feedSelector:'.zoom_in_image img',
				sFrag		:'/128x160_',
				bFrag		:'/520x0_'
			},
			'my.tianya.cn':{
				feedSelector:'.pic-zoomin',
				bigSrc		:'_middlepic',
				sFrag		:'small',
				bFrag		:'middle'
			},
			'diandian.com':{
				feedSelector:'.feed-img',
				bigSrc		:'imgsrc'
			},
			'digu.com':{
				feedSelector:'.picture',
				sFrag		:'_100x75',
				bFrag		:'_640x480'
			},
			'qzone.qq.com':{
				feedSelector:'.img_box a',
				sFrag		:'/160',
				bFrag		:'/460'	
			}
		};

		var $ = function(id) {
			return document.getElementById(id);	
		};

		var $C = function(tag) {
			return document.createElement(tag);
		};

		var $CN = function(className) {
			return document.getElementsByClassName(className);
		};

		var $Q = function(selector, node) {
			var nodes = [];
			selector = selector.split(',');
			for(var i=0; i<selector.length; i++) {
				nodes = nodes.concat(Array.prototype.slice.call((node || document).querySelectorAll(selector)));
			}
			return nodes;
		};

		var getPos = function(source) {
			var pt = {x:0,y:0,width:source.offsetWidth,height:source.offsetHeight};
			do {
				pt.x += source.offsetLeft;
				pt.y += source.offsetTop;
				source = source.offsetParent;
			} while (source);
			return pt;
		};

		var getImgSize = function(imgsrc) {
			var cInfo = cache.imgInfo;
			if(cInfo[imgsrc] && cInfo[imgsrc].height) {
				//console.info(imgsrc+' : cache aimed 1');
				return function() {
					//console.info('cache aimed 2');
					return {
						width: cInfo[imgsrc].width,
						height: cInfo[imgsrc].height
					};
				};
			}
			else {
				var size, w, h;
				cache.imgObj = new Image();
				cache.imgObj.src = imgsrc;
				return function() {
					w = parseInt(cache.imgObj.width);
					h = parseInt(cache.imgObj.height);
					//console.log(w, h);
					return { width:w, height:h };
				};
			}
		};

		var saveImgInfo = function(o) {
			//保存上一次图片的信息，用以缓存
			if(!cache.imgInfo[o.src] && parseInt(o.width) !== 10 && parseInt(o.height) !== 30) {
				cache.imgInfo[o.src] = {width:parseInt(o.width), height:parseInt(o.height)};
				//console.info(o.src+' : cache added.');
			}
		};

		var getSiteName = function() {
			if(cache.siteName) return cache.siteName;
			var i, each;
			for(each in miniblogsConfig) {
				if(cache.loc.indexOf(each) != -1) {
					cache.siteName = each;
					return each;
				}
			}
			return '';
		};

		var getBigImgsrc = function(obj) {
			var tempimgs,
				tempimg,
				imgsrc,
				i,
				l,
				sname = getSiteName(),
				config = (sname && miniblogsConfig[sname]);
			if(obj.tagName === 'IMG' || obj.tagName === 'img') {
				tempimg = obj;
			}
			else{
				tempimgs = obj.getElementsByTagName('IMG');
				if(tempimgs == null || tempimgs.length == 0) {
					throw 'cant found the img node.';
				}
				else{
					tempimg = tempimgs[0];
				}
			}

			//针对使用额外属性保存大图地址的网站
			if(config['bigSrc']) {
				return tempimg.getAttribute(config['bigSrc']);
			}

			//一般处理
			imgsrc = tempimg.getAttribute('src');
			//console.info(imgsrc);
			imgsrc = decodeURIComponent(imgsrc);
			if(typeof config['sFrag'] === 'object') {
				for(i=0, l=config['sFrag'].length; i<l; i++) {
					imgsrc = imgsrc.replace(config['sFrag'][i],config['bFrag'][i]);
				}
			}
			else{
				imgsrc = imgsrc.replace(config['sFrag'],config['bFrag']);
			}
			return imgsrc;
		};

		var _fade = function(spec,callback) {
			var obj = spec.obj,
				fromOpacity,
				toOpacity;
			spec.from = spec.from || obj.style.opacity * 100;
			fromOpacity = spec.from/100;
			toOpacity = spec.to/100;

			obj.style.visibility = '';
			//渐变
			cache.timer && clearInterval(cache.timer);
			cache.timer = setInterval(function() {
				//console.info(obj.style.opacity + ' ' + toOpacity);
				if(obj.style.opacity < toOpacity) {
					obj.style.opacity = parseFloat(obj.style.opacity) + 0.2;
				}
				else if(obj.style.opacity > toOpacity) {
					//修复一个chrome下图片不消失的bug
					var temp = parseFloat(obj.style.opacity) - 0.2;
					temp = (temp <= 0.01) ? 0 : temp;
					obj.style.opacity = temp;
				}
				else if(obj.style.opacity == toOpacity) {
					callback && callback.call(this);
					clearInterval(cache.timer);
				}
				else
					throw 'fadeTo函数异常';
			},25);
		};

		var createImgPop = function(imgsrc) {
			$('miniblogImgPop') && document.body.removeChild($('miniblogImgPop'));
			var temp = $C('img');
			temp.id = 'miniblogImgPop';
			temp.style.visibility = 'hidden';
			temp.src = imgsrc;
			document.body.appendChild(temp);
			return temp;
		};

		var appendPod = function(imgsrc, pos, imgSizeFunc) {
			//防止图片未载入时获取图片大小为0的情况
			//alert(imgSizeFunc().height);
			var imgHeight = imgSizeFunc().height,
				that,
				imgPop,
				scrollTop;
			//console.info(imgsrc, imgHeight);
			//imgHeight小于50px，很主观地判断其图片尚未载入
			if(!imgHeight || imgHeight <= 50) {
				that = this;
				cache.timerHeight = setTimeout(function() {
					appendPod.call(that, imgsrc, pos, imgSizeFunc);
				}, 40);
				return;
			}

			imgPop = $('miniblogImgPop');
			if(!imgPop) {
				imgPop = createImgPop(imgsrc);
			}
			else {
				imgPop.src = imgsrc;
			}
			//for firefox & chrome 's diff
			scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
			var tempTop = (window.innerHeight - imgHeight) > 0 ? (window.innerHeight - imgHeight) : 0;
			imgPop.style.top = (scrollTop + tempTop/2) + 'px';
			imgPop.style.left = pos.x + pos.width + 80 + 'px';
			imgPop.style.opacity = 0;
			imgPop.style.visibility = '';
			
			_fade({obj:imgPop, to:100});
			div_bigImg = null;
			bigImg = null;

			//保存上一次图片的信息，用以缓存
			saveImgInfo(cache.imgObj);
		};

		var removePop = function() {
			return function(e) {
				if(cache.zPressing === false) {
					e.stopPropagation();
					cache.timer && clearInterval(cache.timer);
					var theObj = $('miniblogImgPop');

					if(theObj) {
						_fade({obj:theObj, to:0}, function() {
							cache.imgObj.src = '';
							theObj.style.visibility = 'hidden';
						});
					}
				}
			};
		};

		var imgHover = function(img) {
			var imgsrc = getBigImgsrc(img), getSize;
			return function(e) {
				if(!/http.*/.test(imgsrc)) {
					imgsrc = getBigImgsrc(img);
				}
				//console.info('shift pressing : ' + cache.shiftPressing);
				if(cache.zPressing === false) {
					//console.time('test2');
					e.stopPropagation();
					cache.timerHeight && clearInterval(cache.timerHeight);
					cache.timer && clearInterval(cache.timer);
					getSize = getImgSize(imgsrc);
					appendPod(imgsrc, getPos(img), getSize);
					//console.timeEnd('test2');
				}
			};
		};

		var imgOut = function() {
			return removePop();
		};

		var delegate = function(el, eventType, handler, selector) {
			el = el || document;
			el.addEventListener(eventType, function(e) {
				var node = getHandlerNode(e, selector, el);	
				node && handler.call(el, e, node);
			}, false); 
		};

		var getHandlerNode = function(e, selector, el) {
			//返回我们handler需要的参数
			var nodes;
			el = el || document;
			if (e && e.target && selector) {
				var temp = null;
				if(cache.height) {
					temp = cache.height - document.documentElement.scrollHeight;
				}
				if(cache.nodes && cache.height && Math.abs(temp) < 40 && cache.nodes.length != 0 && cache.location == window.location.href) {
					//console.log('cache aimed!');
					nodes = cache.nodes;
				}
				else {
					nodes = cache.nodes = $Q(selector, el);
					cache.height = document.documentElement.scrollHeight;
					cache.location = window.location.href;
				}
				//console.log(nodes.length);
				for(i=0; i<nodes.length; i++) {
					if(e.target == nodes[i] || isInDomChain(e.target, nodes[i], el)) {
						return nodes[i];
					}
				}
				return false;
			}
		};

		var isInDomChain = function(target, parent, ancestor, maxDepth) {
			var ancestor = ancestor || null,
				maxDepth = maxDepth || 100;
			if (target == ancestor) {
				return false;
			}
			if (target == parent) {
				return true;
			}
			var i = 0;//防止过多嵌套
			while (target != ancestor && target != null && (i++ < maxDepth)) {
				target = target.parentNode;
				if (target == parent) {
					return true;
				}
			}
			return false;
		};

		return {
			prepare : function() {
				this.sitename = getSiteName();
				this.config = (this.sitename && miniblogsConfig[this.sitename]);
			},
			addImgsEventListener : function() {
				delegate(document.body, 'mouseover', function(e, node) {
					imgHover(node).call(null, e);
				}, this.config['feedSelector']);

				delegate(document.body, 'mouseout', imgOut(), this.config['feedSelector']);
			},
			addShiftListener : function() {
				window.addEventListener('keydown',function(e) {
					if(e.keyCode === 90) {
						cache.zPressing = true;
					}
				},false);
				window.addEventListener('keyup',function(e) {
					if(e.keyCode === 90) {
						cache.zPressing = false;
						removePop()(e);
					}
				},false);
			},
			init: function() {
				//准备必要的数据
				this.prepare();
				//绑定imgs hover事件
				this.addImgsEventListener();
				//绑定按键z事件，使图片不会消失，方便看大图
				this.addShiftListener();
			}
		};
	})();

	imgPop.init();

	//增加自定义样式
	GM_addStyle("\
		#miniblogImgPop {\
			box-shadow: 0 3px 15px rgba(34, 25, 25, 1);\
			border: 7px solid rgba(255, 255, 255, 0.7);\
			z-index: 9999;\
			position: absolute;\
		}\
	");

})();
