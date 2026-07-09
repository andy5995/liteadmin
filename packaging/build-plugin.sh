#!/bin/sh
# Build a standalone .deb for a LiteAdmin plugin.
#
#   packaging/build-plugin.sh <plugin-name> <version>
#
# Plugins live in src/plugins/<name>/. The core package excludes that directory,
# so a plugin is shipped as its own .deb: this installs src/plugins/<name>/ into
# /usr/share/liteadmin/plugins/<name>/ and depends on the liteadmin package.
set -eu

name="${1:?usage: build-plugin.sh <plugin-name> <version>}"
version="${2:?usage: build-plugin.sh <plugin-name> <version>}"

src="src/plugins/$name"
control="packaging/$name/control"
[ -d "$src" ] || { echo "no such plugin: $src" >&2; exit 1; }
[ -f "$control" ] || { echo "no control file: $control" >&2; exit 1; }

stage="$(mktemp -d)/$name"
mkdir -p "$stage/DEBIAN" "$stage/usr/share/liteadmin/plugins/$name"
sed "s/__VERSION__/$version/" "$control" > "$stage/DEBIAN/control"
cp -r "$src/." "$stage/usr/share/liteadmin/plugins/$name/"

for script in preinst postinst prerm postrm; do
    if [ -f "packaging/$name/$script" ]; then
        install -m 755 "packaging/$name/$script" "$stage/DEBIAN/$script"
    fi
done

dpkg-deb --build --root-owner-group "$stage" "${name}_${version}_all.deb"
echo "built ${name}_${version}_all.deb"
