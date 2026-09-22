import pytest
from agent import run_conversation, init_client

# Initialize the Groq API client before running tests
init_client()

def test_data_accuracy():
    """Test if the agent accurately fetches and reports data."""
    # "How many total items are in the logistics branch?"
    prompt = "כמה סך הכל פריטים יש בענף לוגיסטיקה?"
    answer, history = run_conversation(prompt)
    
    # Check that the tool was called
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_branch_packing_summary"]
    assert len(tool_calls) > 0, f"Agent did not call the correct tool. Answer was: {answer}"
    
    # 43 is the correct total for the branch in the mock database
    assert "43" in answer, f"Agent failed to report the correct total. Answer was: {answer}"


def test_tool_selection_chart():
    """Test if the agent selects the charting tool correctly."""
    # "Prepare a chart of the trucks"
    prompt = "תכין לי תרשים של המשאיות"
    answer, history = run_conversation(prompt)
    
    # Check that it called a chart tool
    chart_tool_called = any(
        msg.get("name") in ["generate_truck_status_bar_chart", "generate_generic_bar_chart"] 
        for msg in history if isinstance(msg, dict) and msg.get("role") == "tool"
    )
    assert chart_tool_called, f"Agent did not call any chart generation tool. Answer: {answer}"


def test_math_capability():
    """Test if the agent uses the calculator tool for complex math operations."""
    # "Calculate how much is 1324 times 4321"
    prompt = "תחשב כמה זה 1324 כפול 4321"
    answer, history = run_conversation(prompt)
    
    # Check that it called the calculate tool
    calc_tool_called = any(
        msg.get("name") == "calculate" 
        for msg in history if isinstance(msg, dict) and msg.get("role") == "tool"
    )
    assert calc_tool_called, f"Agent did not call the calculate tool. Answer: {answer}"
    
    # The mathematical answer is 5721004
    assert "5721004" in answer or "5,721,004" in answer, f"Agent failed to report the correct math result. Answer was: {answer}"
