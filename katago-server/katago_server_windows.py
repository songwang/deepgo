#!/usr/bin/env python

# /********************************************************************
# Filename: katago_server_windows.py
# Author: Modified for Windows
# Creation Date: Nov, 2024
# **********************************************************************/
#
# A back end API to run KataGo as a REST service on Windows
# Uses katago from PATH instead of local binary
#

from katago_gtp_bot import KataGTPBot
from get_bot_app import get_bot_app

# Use katago from PATH (since it's installed system-wide)
# Use the 10-block model that's included in the repo
katago_cmd = 'katago gtp -model b10.bin.gz -config gtp_ahn_eigen.cfg'
katago_gtp_bot = KataGTPBot( katago_cmd.split() )

# Get an app with 'select-move/<botname>' endpoints
app = get_bot_app( name='katago_gtp_bot', bot=katago_gtp_bot )

#----------------------------
if __name__ == '__main__':
    print("Starting KataGo server for Windows...")
    print("Using model: g170e-b10c128-s1141046784-d204142634.bin.gz")
    print("Server will run on: http://localhost:2718")
    app.run( host='0.0.0.0', port=2718, debug=True)