echo "Updating files.."
git config --global user.name "Zeon"
git config --global user.email "zeon@saahild.com"
git add . || bash reset_git.sh
git commit -m 'chore(ci): automated push' || bash reset_git.sh
git push || bash reset_git.sh
bash reset_git.sh
#git config --global user.name "Neon"
#git config --global user.email "neon@saahild.com"
