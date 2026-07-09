<?php

class PluginHost {
    public $id;
    public $manifest;
    private $dir;

    function __construct($id, $manifest, $dir) {
        $this->id = $id;
        $this->manifest = $manifest;
        $this->dir = $dir;
    }

    function id() { return $this->id; }
    function baseDir() { return $this->dir; }
    function dataDir() { return Plugins::data_dir($this->id); }

    function route($action, callable $handler, array $opts = []) { Plugins::add_route($this->id, $action, $handler, $opts); }
    function service($name, $obj) { Plugins::add_service($name, $obj); }
    function guard($name, callable $handler) { Plugins::add_guard($name, $handler); }
    function getService($name) { return Plugins::service($name); }
    function on($event, callable $handler) { Plugins::add_listener($event, $handler); }
    function emit($event, $payload = null) { Plugins::emit($event, $payload); }
}

class Plugins {
    private static $booted = false;
    private static $plugins = [];
    private static $routes = [];
    private static $services = [];
    private static $guards = [];
    private static $listeners = [];

    static function dir() {
        $cfg = App::config();
        $d = $cfg['plugin_dir'] ?? 'plugins';
        if ($d[0] !== '/') $d = __DIR__ . '/' . $d;
        return $d;
    }

    static function data_dir($id = null) {
        $cfg = App::config();
        $base = $cfg['data_dir'] ?? 'data';
        if ($base[0] !== '/') $base = __DIR__ . '/' . $base;
        $path = $id === null ? $base : $base . '/' . App::safe_name($id);
        if (!is_dir($path)) @mkdir($path, 0770, true);
        return $path;
    }

    static function boot() {
        if (self::$booted) return;
        self::$booted = true;
        $enabled = App::config()['plugins'] ?? [];
        if (!is_array($enabled) || !$enabled) return;
        $enabled = array_flip($enabled);
        $dir = self::dir();
        if (!is_dir($dir)) return;
        foreach (glob($dir . '/*', GLOB_ONLYDIR) as $pdir) {
            $mf = $pdir . '/plugin.json';
            if (!is_file($mf)) continue;
            $manifest = json_decode(file_get_contents($mf), true);
            if (!is_array($manifest) || empty($manifest['name'])) continue;
            $id = $manifest['name'];
            if (!isset($enabled[$id]) || isset(self::$plugins[$id])) continue;
            self::$plugins[$id] = ['manifest' => $manifest, 'dir' => $pdir];
        }
        foreach (self::$plugins as $id => $p) {
            $srv = $p['manifest']['server'] ?? null;
            if (!$srv) continue;
            $file = $p['dir'] . '/' . basename($srv);
            if (!is_file($file)) continue;
            try {
                require_once $file;
                $cls = $p['manifest']['serverClass'] ?? null;
                if (!$cls || !class_exists($cls)) continue;
                $inst = new $cls();
                if (method_exists($inst, 'register')) $inst->register(new PluginHost($id, $p['manifest'], $p['dir']));
            } catch (Throwable $e) {
                error_log('LiteAdmin plugin "' . $id . '" failed to load: ' . $e->getMessage());
            }
        }
    }

    static function list_public() {
        $out = [];
        foreach (self::$plugins as $id => $p) {
            $m = $p['manifest'];
            $out[] = [
                'name' => $id,
                'label' => $m['label'] ?? $id,
                'version' => $m['version'] ?? '',
                'description' => $m['description'] ?? '',
                'client' => !empty($m['client']) ? 'plugins/' . $id . '/' . basename($m['client']) : null,
            ];
        }
        return $out;
    }

    static function add_route($id, $action, callable $handler, array $opts) { self::$routes[$id . ':' . $action] = ['handler' => $handler, 'opts' => $opts]; }
    static function route($id, $action) { return self::$routes[$id . ':' . $action] ?? null; }
    static function add_service($name, $obj) { self::$services[$name] = $obj; }
    static function service($name) { return self::$services[$name] ?? null; }
    static function add_guard($name, callable $handler) { self::$guards[$name] = $handler; }
    static function guard($name) { return self::$guards[$name] ?? null; }
    static function add_listener($event, callable $handler) { self::$listeners[$event][] = $handler; }
    static function emit($event, $payload = null) { foreach (self::$listeners[$event] ?? [] as $h) $h($payload); }
}
