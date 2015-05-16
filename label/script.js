﻿Addon_Id = "label";

var items = te.Data.Addons.getElementsByTagName(Addon_Id);
if (items.length) {
	var item = items[0];
	if (!item.getAttribute("Set")) {
		item.setAttribute("MenuExec", 1);
		item.setAttribute("Menu", "Context");
		item.setAttribute("MenuPos", 1);

		item.setAttribute("KeyOn", "List");
		item.setAttribute("MouseOn", "List");
	}
}

if (window.Addon == 1) {
	Addons.Label =
	{
		RE: /label:(.*)/i,
		CONFIG: fso.BuildPath(te.Data.DataFolder, "config\\label.tsv"),
		bSave: false,
		Changed: {},
		Redraw: {},
		tid: null,

		Edit: function (Ctrl, pt)
		{
			var Selected = GetSelectedArray(Ctrl, pt, true).shift();
			if (Selected && Selected.Count) {
				try {
					var path = api.GetDisplayNameOf(Selected.Item(0), SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
					if (path) {
						var Label = String(te.Labels[path] || "");
						var s = InputDialog(path + (Selected.Count > 1 ? " : " + Selected.Count : "") + "\nlabel:" + Label, Label);
						if (typeof(s) == "string") {
							var notify = {};
							for (var i = Selected.Count; i-- > 0;) {
								Addons.Label.Set(api.GetDisplayNameOf(Selected.Item(i), SHGDN_FORADDRESSBAR | SHGDN_FORPARSING), s);
							}
						}
					}
				}
				catch (e) {
					wsh.Popup(e.description + "\n" + s, 0, TITLE, MB_ICONSTOP);
				}
			}
		},

		Details: function (Ctrl, pt)
		{
			Ctrl.Columns = Ctrl.Columns + ' "System.Contact.Label" -1';
		},

		ExecRemoveItems: function (Ctrl, pt)
		{
			if (!confirmOk("Are you sure?")) {
				return;
			}
			var ar = GetSelectedArray(Ctrl, pt);
			var Selected = ar.shift();
			var SelItem = ar.shift();
			var FV = ar.shift();
			var Label = Addons.Label.LabelPath(FV);
			if (Label) {
				Addons.Label.RemoveItems(Selected, Label);
			}
		},

		LabelPath: function (Ctrl)
		{
			if (Addons.Label.RE.test(api.GetDisplayNameOf(Ctrl, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING))) {
				return RegExp.$1;
			}
		},

		AddMenu: function (hMenu, hParent, nIndex)
		{
			hMenu = api.sscanf(hMenu, "%llx");
			var oList = {};
			Addons.Label.List(oList);
			var nPos = g_nPos;
			for (var s in oList) {
				api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, ++g_nPos, s);
				ExtraMenuData[g_nPos] = s;
				ExtraMenuCommand[g_nPos] = Addons.Label.ExecAdd;
			}
			if (nPos == g_nPos) {
				hMenu = api.sscanf(hParent, "%llx");
				var mii = api.Memory("MENUITEMINFO");
				mii.cbSize = mii.Size;
				mii.fMask = MIIM_STATE;
				mii.fState = MFS_DISABLED;
				api.SetMenuItemInfo(hMenu, nIndex, true, mii);
			}
		},

		ExecAdd: function (Ctrl, pt, Name, nVerb)
		{
			if (!confirmOk("Are you sure?")) {
				return;
			}
			var FV = GetFolderView(Ctrl, pt);
			if (FV) {
				Selected = FV.SelectedItems();
				Addons.Label.AppendItems(Selected, ExtraMenuData[nVerb]);
			}
		},

		ExecRemove: function (Ctrl, pt, Name, nVerb)
		{
			if (!confirmOk("Are you sure?")) {
				return;
			}
			var FV = GetFolderView(Ctrl, pt);
			if (FV) {
				Selected = FV.SelectedItems();
				Addons.Label.RemoveItems(Selected, ExtraMenuData[nVerb]);
			}
		},

		Append: function (Item, Label)
		{
			var path = api.GetDisplayNameOf(Item, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
			if (path) {
				var ar = String(te.Labels[path] || "").split(/\s*;\s*/);
				var o = {};
				for (var i in ar) {
					o[ar[i]] = 1;
				}
				var ar = String(Label || "").split(/\s*;\s*/);
				for (var i in ar) {
					o[ar[i]] = 1;
				}
				ar = [];
				delete o[""];
				for (var i in o) {
					ar.push(i);
				}
				Addons.Label.Set(path, ar.join(";"));
			}
		},
		
		AppendItems: function (Items, Label)
		{
			if (Items) {
				for (var i = 0; i < Items.Count; i++) {
					Addons.Label.Append(Items.Item(i), Label);
				}
			}
		},

		RemoveItems: function (Items, Label)
		{
			if (Items) {
				for (var i = Items.Count; i-- > 0;) {
					Addons.Label.Remove(Items.Item(i), Label);
				}
			}
		},

		Remove: function (Item, Label)
		{
			var s = "";
			var path = api.GetDisplayNameOf(Item, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
			if (path) {
				s = te.Labels[path];
				var arNew = [];
				if (Label) {
					var ar = String(s || "").split(/\s*;\s*/);
					var o = {};
					for (var i in ar) {
						o[ar[i]] = 1;
					}
					var ar = String(Label || "").split(/\s*;\s*/);
					for (var i in ar) {
						o[ar[i]] = 0;
					}
					for (var i in o) {
						if (o[i]) {
							arNew.push(i);
						}
					}
				}
				Addons.Label.Set(path, arNew.join(";"));
			}
			return s;
		},

		Set: function (path, s)
		{
			if (path) {
				var ar = String(te.Labels[path] || "").split(/\s*;\s*/);
				s = s.replace(/[\\?\\*]/g, "");
				if (s) {
					te.Labels[path] = s;
				}
				else {
					delete te.Labels[path];
				}
				var o = {};
				var bChanged = false;
				for (var j in ar) {
					o[ar[j]] = 1;
				}
				ar = (s || "").split(/\s*;\s*/);
				for (var j in ar) {
					o[ar[j]] ^= 1;
				}
				for (var j in o) {
					if (o[j]) {
						Addons.Label.Changed[j] = 1;
						Addons.Label.Redraw[fso.GetParentFolderName(path)] = true;
						bChanged = true;
					}
				}
				if (bChanged) {
					clearTimeout(Addons.Label.tid);
					Addons.Label.tid = setTimeout(Addons.Label.Notify, 500);
					Addons.Label.bSave = true;
				}
			}
		},

		Notify: function ()
		{
			var cFV = te.Ctrls(CTRL_FV);
			for (var i in cFV) {
				var FV = cFV[i];
				if (FV.hwnd) {
					var path = api.GetDisplayNameOf(FV, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
					if (Addons.Label.Redraw[path]) {
						api.InvalidateRect(FV.hwndList || FV.hwndView || FV.hwnd, null, false);
					}
					var s = Addons.Label.LabelPath(FV);
					if (s) {
						var b = false;
						for (var j in Addons.Label.Changed) {
							b = api.PathMatchSpec(j, s);
							if (b) {
								break;
							}
						}
						if (b) {
							FV.Refresh(true);
						}
					}
				}
			}
			Addons.Label.Changed = {};
			Addons.Label.Redraw = {};
		},

		List: function (list)
		{
			var ix = [];
			for (var path in te.Labels) {
				var s = te.Labels[path];
				var ar = s.split(/\s*;\s*/);
				for (var i in ar) {
					var s = ar[i];
					if (s) {
						ix.push(s);
					}
				}
			}
			var ix = ix.sort(function (a, b) {
				return api.StrCmpLogical(b, a)
			});
			for (var i = ix.length; i--;) {
				list[ix[i]] = true;
			}
		}

	}
	te.Labels = te.Object();
	try {
		var ado = te.CreateObject("Adodb.Stream");
		ado.CharSet = "utf-8";
		ado.Open();
		ado.LoadFromFile(Addons.Label.CONFIG);
		while (!ado.EOS) {
			var ar = ado.ReadText(adReadLine).split("\t");
			te.Labels[ar[0]] = ar[1];
		}
		ado.Close();
		delete te.Labels[""];
	} catch (e) {
	}

	AddEvent("SaveConfig", function ()
	{
		if (Addons.Label.bSave) {
			var ado = te.CreateObject("Adodb.Stream");
			ado.CharSet = "utf-8";
			ado.Open();
			delete te.Labels[""];
			for (var i in te.Labels) {
				ado.WriteText([i, te.Labels[i]].join("\t") + "\r\n");
			}
			ado.SaveToFile(Addons.Label.CONFIG, adSaveCreateOverWrite);
			ado.Close();
			Addons.Label.bSave = false;
		}
	});

	AddEvent("ListViewCreated", function (Ctrl)
	{
		var Label = Addons.Label.LabelPath(Ctrl);
		if (Label) {
			setTimeout(function () {
				var b, ar;
				var bWC = /[\*\?]/.test(Label);
				for (var path in te.Labels) {
					var s = te.Labels[path];
					if (bWC || (Label.indexOf(" ") >= 0 && Label.indexOf(";") < 0)) {
						b = true;
						ar = null;
						var ar2 = Label.split(/\s+/);
						for (var j in ar2) {
							var s2 = ar2[j];
							if (!api.PathMatchSpec(s2, s)) {
								b = false;
								if (bWC) {
									ar = s.split(/\s*;\s*/);
									for (var i in ar) {
										if (api.PathMatchSpec(ar[i], s2)) {
											b = true;
											break;
										}
									}
								}
								break;
							}
						}
					}
					else {
						b = api.PathMatchSpec(Label, s);
					}
					if (!b && bWC) {
						ar = ar || s.split(/\s*;\s*/);
						for (var i in ar) {
							if (api.PathMatchSpec(ar[i], Label)) {
								b = true;
								break;
							}
						}
					}
					if (b) {
						Ctrl.AddItem(path);
					}
				}
				Ctrl.SortColumn = "";
			}, 200);
		}
	});

	AddEvent("TranslatePath", function (Ctrl, Path)
	{
		if (Addons.Label.RE.test(Path)) {
			return ssfRESULTSFOLDER;
		}
	}, true);

	AddEvent("GetTabName", function (Ctrl)
	{
		return Addons.Label.LabelPath(Ctrl) || undefined;
	}, true);

	AddEvent("GetIconImage", function (Ctrl, BGColor)
	{
		if (Addons.Label.LabelPath(Ctrl)) {
			return "../addons/label/label16.png";
		}
	});

	AddEvent("Command", function (Ctrl, hwnd, msg, wParam, lParam)
	{
		if (Ctrl.Type == CTRL_SB || Ctrl.Type == CTRL_EB) {
			if (Addons.Label.LabelPath(Ctrl)) {
				if ((wParam & 0xfff) == CommandID_DELETE - 1) {
					return S_OK;
				}
			}
		}
	});

	AddEvent("InvokeCommand", function (ContextMenu, fMask, hwnd, Verb, Parameters, Directory, nShow, dwHotKey, hIcon)
	{
		if (Verb == CommandID_DELETE - 1) {
			var FV = ContextMenu.FolderView;
			if (FV && Addons.Label.LabelPath(FV)) {
				return S_OK;
			}
		}
	});

	AddEvent("DragEnter", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect)
	{
		if (Ctrl.Type <= CTRL_EB || Ctrl.Type == CTRL_DT) {
			var Label = Addons.Label.LabelPath(Ctrl);
			if (Label && !/[\?\*;]/.test(Label)) {
				return S_OK;
			}
		}
	});

	AddEvent("DragOver", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect)
	{
		if (Ctrl.Type <= CTRL_EB) {
			var Label = Addons.Label.LabelPath(Ctrl);
			if (Label && !/[\?\*;]/.test(Label)) {
				if (Ctrl.HitTest(pt, LVHT_ONITEM) < 0) {
					pdwEffect.X = DROPEFFECT_LINK;
					return S_OK;
				}
			}
		}
		if (Ctrl.Type == CTRL_DT) {
			var Label = Addons.Label.LabelPath(Ctrl);
			if (Label && !/[\?\*;]/.test(Label)) {
				pdwEffect.X = DROPEFFECT_LINK;
				return S_OK;
			}
		}
	});

	AddEvent("Drop", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect)
	{
		var Label = Addons.Label.LabelPath(Ctrl);
		if (Label && !/[\?\*;]/.test(Label)) {
			var nIndex = -1;
			if (Ctrl.Type <= CTRL_EB) {
				nIndex = Ctrl.HitTest(pt, LVHT_ONITEM);
			}
			else if (Ctrl.Type != CTRL_DT) {
				return S_OK;
			}
			if (nIndex < 0) {
				Addons.Label.AppendItems(dataObj, Label);
			}
			return S_OK;
		}
	});

	AddEvent("Dragleave", function (Ctrl)
	{
		return S_OK;
	});

	AddEvent("ChangeNotify", function (Ctrl, pidls)
	{
		if (pidls.lEvent & (SHCNE_DELETE | SHCNE_DRIVEREMOVED | SHCNE_MEDIAREMOVED | SHCNE_NETUNSHARE | SHCNE_RMDIR | SHCNE_SERVERDISCONNECT)) {
			Addons.Label.Remove(pidls[0]);
		}
		if (pidls.lEvent & (SHCNE_RENAMEFOLDER | SHCNE_RENAMEITEM)) {
			Addons.Label.Append(pidls[1], Addons.Label.Remove(pidls[0]));
		}
	});

	AddEvent("Context", function (Ctrl, hMenu, nPos, Selected, item, ContextMenu)
	{
		var Label = Addons.Label.LabelPath(Ctrl);
		if (Label && !/[\?\*;]/.test(Label)) {
			if (ContextMenu) {
				var mii = api.Memory("MENUITEMINFO");
				mii.cbSize = mii.Size;
				mii.fMask = MIIM_STATE | MIIM_ID;
				for (var i = api.GetMenuItemCount(hMenu); i--;) {
					api.GetMenuItemInfo(hMenu, i, true, mii);
					if (mii.wID == CommandID_DELETE + ContextMenu.idCmdFirst - 1) {
						mii.fState = MFS_DISABLED;
						api.SetMenuItemInfo(hMenu, i, true, mii);
					}
				}
			}
			api.InsertMenu(hMenu, -1, MF_BYPOSITION | MF_STRING, ++nPos, GetText('Remove'));
			ExtraMenuCommand[nPos] = Addons.Label.ExecRemoveItems;
		}
		return nPos;
	});

	if (items.length) {
		Addons.Label.strName = GetText(item.getAttribute("MenuName") || api.PSGetDisplayName("System.Contact.Label"));
		//Menu
		if (item.getAttribute("MenuExec")) {
			Addons.Label.nPos = api.LowPart(item.getAttribute("MenuPos"));
			AddEvent(item.getAttribute("Menu"), function (Ctrl, hMenu, nPos, Selected, item)
			{
				if (item && item.IsFileSystem) {
					var mii = api.Memory("MENUITEMINFO");
					mii.cbSize = mii.Size;
					mii.fMask = MIIM_STRING | MIIM_SUBMENU;
					mii.hSubMenu = api.CreatePopupMenu();
					mii.dwTypeData = Addons.Label.strName;
					api.InsertMenu(mii.hSubMenu, 0, MF_BYPOSITION | MF_STRING, ++nPos, GetText("&Edit"));
					ExtraMenuCommand[nPos] = Addons.Label.Edit;
					if (Ctrl.CurrentViewMode == FVM_DETAILS) {
						if (!/"System\.Contact\.Label"/.test(Ctrl.Columns(1))) {
							api.InsertMenu(mii.hSubMenu, MAXINT, MF_BYPOSITION | MF_STRING, ++nPos, GetText("Details"));
							ExtraMenuCommand[nPos] = Addons.Label.Details;
						}
					}
					var mii2 = api.Memory("MENUITEMINFO");
					mii2.cbSize = mii.Size;
					mii2.fMask = MIIM_STRING | MIIM_SUBMENU;
					mii2.hSubMenu = api.CreatePopupMenu();
					mii2.dwTypeData = GetText("Add");
					api.InsertMenu(mii2.hSubMenu, 0, MF_BYPOSITION | MF_STRING, 0, api.sprintf(99, '\tJScript\tAddons.Label.AddMenu("%llx", "%llx", %d)', mii2.hSubMenu, mii.hSubMenu, 1));
					api.InsertMenuItem(mii.hSubMenu, 1, true, mii2);

					mii2.fMask = MIIM_STRING | MIIM_SUBMENU | MIIM_STATE;
					mii2.fState = MFS_DISABLED;
					mii2.hSubMenu = api.CreatePopupMenu();
					mii2.dwTypeData = GetText("Remove");
					var o = {};
					for (var i = Selected.Count; i-- > 0;) {
						var path = api.GetDisplayNameOf(Selected.Item(i), SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
						if (path) {
							var ar = String(te.Labels[path] || "").split(/\s*;\s*/);
							for (var j in ar) {
								o[ar[j]] = 1;
							}
						}
					}
					var nPos2 = nPos;
					delete o[""];
					for (var s in o) {
						api.InsertMenu(mii2.hSubMenu, MAXINT, MF_BYPOSITION | MF_STRING, ++nPos, s);
						mii2.fState = MFS_ENABLED;
						ExtraMenuData[nPos] = s;
						ExtraMenuCommand[nPos] = Addons.Label.ExecRemove;
					}
					api.InsertMenuItem(mii.hSubMenu, 2, true, mii2);

					api.InsertMenuItem(hMenu, Addons.Label.nPos, true, mii);
				}
				return nPos;
			});
		}
		//Key
		if (item.getAttribute("KeyExec")) {
			SetKeyExec(item.getAttribute("KeyOn"), item.getAttribute("Key"), Addons.Label.Edit, "Func");
		}
		//Mouse
		if (item.getAttribute("MouseExec")) {
			SetGestureExec(item.getAttribute("MouseOn"), item.getAttribute("Mouse"), Addons.Label.Edit, "Func");
		}

		AddTypeEx("Add-ons", "Label", Addons.Label.Edit);
	}

}
