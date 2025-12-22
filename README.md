**PLEASE NOTED THAT** this is still a *test* version of Zylo, it'll have some bugs here and there but will be fix
when the full release of the app is out!

*The app use some of libs of Python and Javascript libs for HTML files. Some are pre-installed in the file folder, some aren't like the Python libs so you will need to install them manually by command prompt.*

> **On how to install the Python libs :**
- Download the Official Python app, any version is fine if it's above 3.1x, *older version of Python may break or bug the app*.
- Go into the app folder and click the `This PC > ... > Zylo-Beta-1.x`, type cmd and press *Enter*, this will open the *Command Prompt* linked to the app folder.
- Run ```pip install -r requirements.txt```, it may take a few minutes to download all the libs for Python.
- After the libs are installed, you can run the app either by *double clicking the main.py* or *clicking the Zylo.exe*.

> **Storage locations :**

- Data JSON now lives under `backend/data/`.
- User uploads are now under `backend/uploads/` and are served at `/uploads/<username>/<filename>`.
- On startup, the server will migrate any legacy `data/` and `uploads/` folders from repo root into `backend/` automatically.

> **If run on Pydroid 3 :**

- Install all the libs in the `requirements.txt`.
- Change the `local_ip` and `host_ip` in `main.py` and `app.py`.
- Change them to your phone IP and/or/if you're using 4G/5G, use the IP that you are using 4G/5G.

# **NOTES:**

- The app can be run without *Internet* but some features of the app maybe disable because most of them need Wi-Fi to process.

- Please also noted that on `Pydroid 3`, it runs kinda slow so it might take some time to load to the main page of the app.

> **[ 6:12 PM 10/18/2025 ]**
