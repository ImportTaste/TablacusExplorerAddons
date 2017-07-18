﻿var item = GetAddonElement('thumbplus');

Addons.ThumbPlus = {
	FV: {},
	fStyle: LVIS_CUT | LVIS_SELECTED,
	Filter: item.getAttribute("Filter") || "",
	Priority: item.getAttribute("Priority") || "*.zip\\*",
	Disable: api.LoadString(hShell32, 9007).replace(/^.*?#|#.*$/g, "") || "*.jpg"
};

if (window.Addon == 1) {
	AddEvent("HandleIcon", function (Ctrl, pid)
	{
		if (Ctrl.Type == CTRL_SB && Ctrl.IconSize > 32) {
			var db = Addons.ThumbPlus.FV[Ctrl.Id];
			if (!db) {
				Addons.ThumbPlus.FV[Ctrl.Id] = db = { "*": Ctrl.IconSize };
			}
			var path = pid.Path;
			if (api.PathMatchSpec(path, Addons.ThumbPlus.Priority) || (api.PathMatchSpec(path, Addons.ThumbPlus.Filter) && !api.PathMatchSpec(path, Addons.ThumbPlus.Disable))) {
				var name = fso.GetFileName(path);
				if (db[name]) {
					return true;
				}
				var image = te.WICBitmap().FromFile(path);
				if (image) {
					db[name] = GetThumbnail(image, Ctrl.IconSize * screen.logicalYDPI / 96, true);
					return true;
				}
			}
		}
	}, true);

	AddEvent("ItemPostPaint", function (Ctrl, pid, nmcd, vcd)
	{
		if (Ctrl.Type == CTRL_SB && Ctrl.IconSize > 32) {
			var db = Addons.ThumbPlus.FV[Ctrl.Id];
			if (db) {
				var image = db[fso.GetFileName(pid.Path)];
				if (/object/i.test(typeof image)) {
					var cl, fStyle, rc = api.Memory("RECT");
					rc.Left = LVIR_ICON;
					api.SendMessage(Ctrl.hwndList, LVM_GETITEMRECT, nmcd.dwItemSpec, rc);
					var state = api.SendMessage(Ctrl.hwndList, LVM_GETITEMSTATE, nmcd.dwItemSpec, Addons.ThumbPlus.fStyle);
					if (state == LVIS_SELECTED) {
						cl = CLR_DEFAULT;
						fStyle = api.GetFocus() == Ctrl.hwndList ? ILD_SELECTED : ILD_FOCUS;
					} else {
						cl = CLR_NONE;
						fStyle = (state & LVIS_CUT) || api.GetAttributesOf(pid, SFGAO_HIDDEN) ? ILD_SELECTED : ILD_NORMAL;
					}
					image = GetThumbnail(image, Ctrl.IconSize * screen.logicalYDPI / 96, true);
					if (image) {
						image.DrawEx(nmcd.hdc, rc.Left + (rc.Right - rc.Left - image.GetWidth()) / 2, rc.Top + (rc.Bottom - rc.Top - image.GetHeight()) / 2, 0, 0, cl, cl, fStyle);
						return S_OK;
					}
				}
			}
		}
	}, true);

	AddEvent("NavigateComplete", function (Ctrl)
	{
		delete Addons.ThumbPlus.FV[Ctrl.Id];
	});

	AddEvent("IconSizeChanged", function (Ctrl)
	{
		var db = Addons.ThumbPlus.FV[Ctrl.Id];
		if (db) {
			if (db["*"] < Ctrl.IconSize) {
				delete Addons.ThumbPlus.FV[Ctrl.Id];
			}
		}
	});

	if (api.IsAppThemed() && WINVER >= 0x600) {
		AddEvent("Load", function ()
		{
			if (!Addons.ClassicStyle) {
				Addons.ThumbPlus.fStyle = LVIS_CUT;
			}
		});
	}
} else {
	importScript("addons\\" + Addon_Id + "\\options.js");
}