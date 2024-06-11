import subprocess
 
def check_wifi_profile_exists(ssid):
    cmd = f"netsh wlan show profile name={ssid}"
    result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    return "Profile " + ssid + " is not found" not in result.stdout

def change_wifi_network(ssid):
    if check_wifi_profile_exists(ssid):
        cmd = f"netsh wlan connect name={ssid} ssid={ssid}"
        subprocess.run(cmd, shell=True)
        print("Connected to Wi-Fi network:", ssid)
    else:
        print("Wi-Fi profile", ssid, "is not found.")
 
# Example usage:
# change_wifi_network("rks")
