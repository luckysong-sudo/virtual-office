"""
Virtual Office - HuggingFace Space
代理到本地 server.js 的 WebSocket/HTTP 接口
"""
import streamlit as st
import requests
import json

st.set_page_config(page_title="Virtual Office", layout="wide")

# 服务器地址
SERVER_URL = "http://localhost:7860"

st.title("🏢 Virtual Office - 虚拟办公室")
st.markdown("---")

# 获取服务器状态
try:
    status = requests.get(f"{SERVER_URL}/?endpoint=status").json()
    if status.get("success"):
        office = status["office"]
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("👥 团队成员", office["total_agents"])
        col2.metric("😊 平均心情", office["avg_mood"])
        col3.metric("⚡ 平均精力", office["avg_energy"])
        col4.metric("📅 时段", "日间" if not office["is_night"] else "夜间")
except:
    st.warning("⚠️ 服务器未连接")

# 获取 Agent 列表
try:
    agents = requests.get(f"{SERVER_URL}/?endpoint=agents").json()
    if agents.get("success"):
        st.subheader("👥 团队成员")
        for agent in agents["agents"]:
            st.write(f"**{agent['name']}** - {agent['role']} | Mood: {agent['mood']} | Energy: {agent['energy']}")
except:
    pass

# 聊天功能
st.subheader("💬 与 Agent 对话")
agent_name = st.selectbox("选择 Agent", ["Alice Chen", "Bob Wang", "Carol Li", "David Zhang", "Eve Liu", "Frank Wu", "Grace Zhao", "Henry Xu"])
message = st.text_input("输入消息")

if st.button("发送"):
    try:
        response = requests.post(f"{SERVER_URL}/api/chat", json={"agent": agent_name, "message": message})
        if response.status_code == 200:
            data = response.json()
            st.success(f"回复: {data.get('reply', 'No reply')}")
        else:
            st.error(f"Error: {response.status_code}")
    except Exception as e:
        st.error(f"Connection error: {str(e)}")
