export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.C0otuNCA.js",app:"_app/immutable/entry/app.BtvNII8S.js",imports:["_app/immutable/entry/start.C0otuNCA.js","_app/immutable/chunks/DbnA_IQn.js","_app/immutable/chunks/8qVaMlJz.js","_app/immutable/chunks/Dglfn3Y6.js","_app/immutable/entry/app.BtvNII8S.js","_app/immutable/chunks/8qVaMlJz.js","_app/immutable/chunks/DEAL1xtT.js","_app/immutable/chunks/D6Xv_Zl9.js","_app/immutable/chunks/sc5tX4ha.js","_app/immutable/chunks/Dglfn3Y6.js","_app/immutable/chunks/BHZS8Exj.js","_app/immutable/chunks/BGbV5fOR.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/history",
				pattern: /^\/history\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/results",
				pattern: /^\/results\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/run",
				pattern: /^\/run\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
